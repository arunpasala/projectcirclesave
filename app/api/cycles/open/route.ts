import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getMonthKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const circleId = Number(body?.circle_id);

    if (!circleId) {
      return NextResponse.json({ error: "Invalid circle id." }, { status: 400 });
    }

    const monthKey = getMonthKey();

    const { data: existingMonthCycle, error: existingMonthCycleError } = await supabase
      .from("circle_cycles")
      .select("id, status, cycle_no, month_key")
      .eq("circle_id", circleId)
      .eq("month_key", monthKey)
      .limit(1)
      .maybeSingle();

    if (existingMonthCycleError) {
      return NextResponse.json(
        { error: `Failed to check existing monthly cycle: ${existingMonthCycleError.message}` },
        { status: 500 }
      );
    }

    if (existingMonthCycle) {
      return NextResponse.json(
        {
          error:
            existingMonthCycle.status === "COMPLETED"
              ? `A cycle for ${monthKey} already exists and is completed. Only one payout cycle is allowed per month.`
              : `A cycle for ${monthKey} already exists and is currently ${existingMonthCycle.status}.`,
        },
        { status: 400 }
      );
    }

    const { data: nextSchedule, error: nextScheduleError } = await supabase
      .from("payout_schedule")
      .select("id, circle_id, cycle_no, recipient_user_id, status")
      .eq("circle_id", circleId)
      .neq("status", "PAID")
      .order("cycle_no", { ascending: true })
      .limit(1)
      .single();

    if (nextScheduleError || !nextSchedule) {
      return NextResponse.json(
        { error: "No pending payout schedule found. Generate the payout schedule first." },
        { status: 404 }
      );
    }

    const { data: circle, error: circleError } = await supabase
      .from("circles")
      .select("id, contribution_amount")
      .eq("id", circleId)
      .single();

    if (circleError || !circle) {
      return NextResponse.json({ error: "Circle not found." }, { status: 404 });
    }

    const { data: approvedMembers, error: membersError } = await supabase
      .from("circle_members")
      .select("user_auth_id")
      .eq("circle_id", circleId)
      .eq("status", "APPROVED");

    if (membersError) {
      return NextResponse.json(
        { error: `Failed to load approved members: ${membersError.message}` },
        { status: 500 }
      );
    }

    if (!approvedMembers || approvedMembers.length < 2) {
      return NextResponse.json(
        { error: "At least two approved members are required to open a cycle." },
        { status: 400 }
      );
    }

    const recipientUserId = nextSchedule.recipient_user_id;
    const payers = approvedMembers.filter((m: any) => m.user_auth_id !== recipientUserId);

    if (payers.length === 0) {
      return NextResponse.json(
        { error: "No eligible payers found for this cycle." },
        { status: 400 }
      );
    }

    const amountPerMember = Number(circle.contribution_amount);
    const expectedTotal = amountPerMember * payers.length;

    const { data: cycle, error: cycleError } = await supabase
      .from("circle_cycles")
      .insert({
        circle_id: circleId,
        cycle_no: nextSchedule.cycle_no,
        recipient_user_id: recipientUserId,
        month_key: monthKey,
        amount_per_member: amountPerMember,
        total_members: approvedMembers.length,
        expected_total: expectedTotal,
        status: "OPEN",
      })
      .select()
      .single();

    if (cycleError || !cycle) {
      return NextResponse.json(
        {
          error: `Failed to create monthly cycle: ${cycleError?.message || "Unknown database error"}`,
        },
        { status: 500 }
      );
    }

    const paymentRows = payers.map((payer: any) => ({
      cycle_id: cycle.id,
      circle_id: circleId,
      payer_user_id: payer.user_auth_id,
      payee_user_id: recipientUserId,
      amount: amountPerMember,
      payment_method: "CASH",
      payment_status: "PENDING",
    }));

    const { error: paymentInsertError } = await supabase
      .from("cycle_payments")
      .insert(paymentRows);

    if (paymentInsertError) {
      return NextResponse.json(
        {
          error: `Cycle was created, but payment rows failed: ${paymentInsertError.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Monthly cycle opened successfully.",
      cycle,
    });
  } catch (error: any) {
    console.error("POST /api/cycles/open error:", error);
    return NextResponse.json(
      {
        error: error?.message || "Unexpected server error while opening monthly cycle.",
      },
      { status: 500 }
    );
  }
}