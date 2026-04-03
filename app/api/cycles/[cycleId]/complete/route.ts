import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function invoiceNo(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ cycleId: string }> }
) {
  try {
    const { cycleId } = await context.params;
    const cycleIdNum = Number(cycleId);

    const { data: cycle, error: cycleError } = await supabase
      .from("circle_cycles")
      .select("*")
      .eq("id", cycleIdNum)
      .single();

    if (cycleError || !cycle) {
      return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
    }

    const { data: payments, error: paymentsError } = await supabase
      .from("cycle_payments")
      .select("*")
      .eq("cycle_id", cycleIdNum);

    if (paymentsError || !payments) {
      return NextResponse.json({ error: "Payments not found" }, { status: 404 });
    }

    const allDone = payments.every((p: any) =>
      ["SUBMITTED", "CONFIRMED"].includes(p.payment_status)
    );

    if (!allDone) {
      return NextResponse.json(
        { error: "All payments must be submitted before completion" },
        { status: 400 }
      );
    }

    const { error: cycleUpdateError } = await supabase
      .from("circle_cycles")
      .update({
        status: "COMPLETED",
        closed_at: new Date().toISOString(),
      })
      .eq("id", cycleIdNum);

    if (cycleUpdateError) {
      return NextResponse.json({ error: cycleUpdateError.message }, { status: 500 });
    }

    const { error: scheduleUpdateError } = await supabase
      .from("payout_schedule")
      .update({ status: "PAID" })
      .eq("circle_id", cycle.circle_id)
      .eq("cycle_no", cycle.cycle_no);

    if (scheduleUpdateError) {
      return NextResponse.json({ error: scheduleUpdateError.message }, { status: 500 });
    }

    const payerInvoices = payments.map((p: any) => ({
      circle_id: cycle.circle_id,
      cycle_id: cycle.id,
      invoice_type: "PAYER_RECEIPT",
      user_id: p.payer_user_id,
      invoice_no: invoiceNo("PAY"),
      amount: p.amount,
      metadata: {
        payee_user_id: p.payee_user_id,
        payment_method: p.payment_method,
        transfer_reference: p.transfer_reference,
      },
    }));

    const recipientInvoice = {
      circle_id: cycle.circle_id,
      cycle_id: cycle.id,
      invoice_type: "RECIPIENT_SUMMARY",
      user_id: cycle.recipient_user_id,
      invoice_no: invoiceNo("REC"),
      amount: cycle.expected_total,
      metadata: {
        cycle_no: cycle.cycle_no,
        month_key: cycle.month_key,
      },
    };

    const { error: invoiceError } = await supabase
      .from("invoices")
      .insert([...payerInvoices, recipientInvoice]);

    if (invoiceError) {
      return NextResponse.json({ error: invoiceError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: "Cycle completed and invoices generated",
    });
  } catch (error: any) {
    console.error("POST /api/cycles/[cycleId]/complete error:", error);
    return NextResponse.json(
      { error: error.message || "Server error" },
      { status: 500 }
    );
  }
}