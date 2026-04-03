import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ cycleId: string }> }
) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: () => {},
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { cycleId } = await context.params;
    const cycleIdNum = Number(cycleId);
    const body = await req.json();

    const paymentMethod = String(body?.payment_method || "").toUpperCase();
    const transferReference = String(body?.transfer_reference || "");

    if (!["CASH", "BANK_TRANSFER"].includes(paymentMethod)) {
      return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
    }

    const { data: cycle, error: cycleError } = await admin
      .from("circle_cycles")
      .select("id, circle_id, recipient_user_id, status")
      .eq("id", cycleIdNum)
      .single();

    if (cycleError || !cycle) {
      return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
    }

    if (cycle.status === "COMPLETED") {
      return NextResponse.json({ error: "Cycle already completed" }, { status: 400 });
    }

    if (user.id === cycle.recipient_user_id) {
      return NextResponse.json(
        { error: "Recipient cannot submit payment in their own cycle" },
        { status: 400 }
      );
    }

    const { data: payment, error: paymentError } = await admin
      .from("cycle_payments")
      .update({
        payment_method: paymentMethod,
        transfer_reference: transferReference,
        payment_status: "SUBMITTED",
        submitted_at: new Date().toISOString(),
      })
      .eq("cycle_id", cycleIdNum)
      .eq("payer_user_id", user.id)
      .select()
      .single();

    if (paymentError || !payment) {
      return NextResponse.json(
        { error: paymentError?.message || "Payment record not found" },
        { status: 404 }
      );
    }

    const { data: allPayments, error: allPaymentsError } = await admin
      .from("cycle_payments")
      .select("id, payment_status")
      .eq("cycle_id", cycleIdNum);

    if (allPaymentsError) {
      return NextResponse.json({ error: allPaymentsError.message }, { status: 500 });
    }

    const allSubmitted =
      allPayments &&
      allPayments.length > 0 &&
      allPayments.every((p: any) =>
        ["SUBMITTED", "CONFIRMED"].includes(p.payment_status)
      );

    if (allSubmitted) {
      await admin
        .from("circle_cycles")
        .update({ status: "READY" })
        .eq("id", cycleIdNum);
    }

    return NextResponse.json({
      message: "Payment submitted successfully",
      payment,
    });
  } catch (error: any) {
    console.error("POST /api/cycles/[cycleId]/pay error:", error);
    return NextResponse.json(
      { error: error.message || "Server error" },
      { status: 500 }
    );
  }
}