import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabase/admin";
import { requireAuthUserId } from "@/lib/auth-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authUserId = requireAuthUserId(req);
    const { id } = await context.params;
    const circleId = Number(id);

    if (!Number.isInteger(circleId) || circleId <= 0) {
      return NextResponse.json({ error: "Invalid circle id" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const cycleNo = Number(body?.cycleNo);

    if (!Number.isInteger(cycleNo) || cycleNo <= 0) {
      return NextResponse.json({ error: "Invalid cycle number" }, { status: 400 });
    }

    // 1) Load circle and verify owner
    const { data: circle, error: circleError } = await supabaseAdmin
      .from("circles")
      .select("id, owner_auth_id, name, contribution_amount")
      .eq("id", circleId)
      .maybeSingle();

    if (circleError) {
      return NextResponse.json({ error: circleError.message }, { status: 500 });
    }

    if (!circle) {
      return NextResponse.json({ error: "Circle not found" }, { status: 404 });
    }

    if (circle.owner_auth_id !== authUserId) {
      return NextResponse.json(
        { error: "Only the circle owner can execute payout" },
        { status: 403 }
      );
    }

    // 2) Load payout schedule row for this cycle
    const { data: schedule, error: scheduleError } = await supabaseAdmin
      .from("payout_schedule")
      .select("id, circle_id, cycle_no, recipient_user_id, status")
      .eq("circle_id", circleId)
      .eq("cycle_no", cycleNo)
      .maybeSingle();

    if (scheduleError) {
      return NextResponse.json({ error: scheduleError.message }, { status: 500 });
    }

    if (!schedule) {
      return NextResponse.json(
        { error: "Payout schedule not found for this cycle" },
        { status: 404 }
      );
    }

    if (schedule.status === "PAID") {
      return NextResponse.json(
        { error: "Payout already completed for this cycle" },
        { status: 409 }
      );
    }

    if (schedule.status !== "READY") {
      return NextResponse.json(
        { error: `Payout is not ready. Current status: ${schedule.status}` },
        { status: 400 }
      );
    }

    // 3) Count approved members
    const { data: members, error: memberError } = await supabaseAdmin
      .from("circle_members")
      .select("id, user_auth_id")
      .eq("circle_id", circleId)
      .eq("status", "APPROVED");

    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    const memberCount = members?.length ?? 0;

    if (memberCount <= 0) {
      return NextResponse.json(
        { error: "No approved members found" },
        { status: 400 }
      );
    }

    // 4) Count contributions/payments for this cycle
    // Adjust this if your true source of payment truth is different.
    const { data: contributions, error: contributionsError } = await supabaseAdmin
      .from("contributions")
      .select("id")
      .eq("circle_id", circleId)
      .eq("cycle_no", cycleNo);

    if (contributionsError) {
      return NextResponse.json(
        { error: contributionsError.message },
        { status: 500 }
      );
    }

    const paidCount = contributions?.length ?? 0;

    if (paidCount !== memberCount) {
      return NextResponse.json(
        {
          error: "Payout cannot be executed until all approved members contribute",
          expectedContributions: memberCount,
          receivedContributions: paidCount,
        },
        { status: 400 }
      );
    }

    // 5) Compute payout amount
    const payoutAmount = Number(circle.contribution_amount) * memberCount;

    if (!payoutAmount || payoutAmount <= 0) {
      return NextResponse.json(
        { error: "Invalid payout amount" },
        { status: 400 }
      );
    }

    // 6) Prevent duplicate payout for same circle/cycle
    const { data: existingPayout, error: existingPayoutError } = await supabaseAdmin
      .from("payouts")
      .select("id")
      .eq("circle_id", circleId)
      .eq("cycle_no", cycleNo)
      .maybeSingle();

    if (existingPayoutError) {
      return NextResponse.json(
        { error: existingPayoutError.message },
        { status: 500 }
      );
    }

    if (existingPayout) {
      return NextResponse.json(
        { error: "Duplicate payout prevented by database constraint" },
        { status: 409 }
      );
    }

    // 7) Insert payout row
    const { data: payout, error: payoutInsertError } = await supabaseAdmin
      .from("payouts")
      .insert({
        circle_id: circleId,
        cycle_no: cycleNo,
        recipient_user_id: schedule.recipient_user_id,
        amount: payoutAmount,
        status: "COMPLETED",
      })
      .select("*")
      .single();

    if (payoutInsertError || !payout) {
      return NextResponse.json(
        { error: payoutInsertError?.message || "Failed to create payout" },
        { status: 500 }
      );
    }

    // 8) Mark payout schedule as PAID
    const { error: scheduleUpdateError } = await supabaseAdmin
      .from("payout_schedule")
      .update({ status: "PAID" })
      .eq("id", schedule.id);

    if (scheduleUpdateError) {
      return NextResponse.json(
        { error: scheduleUpdateError.message },
        { status: 500 }
      );
    }

    // 9) Audit log
    const { error: auditError } = await supabaseAdmin.from("audit_logs").insert({
      actor_user_id: authUserId,
      action_type: "PAYOUT_EXECUTED",
      circle_id: circleId,
      target_id: String(payout.id),
      metadata: {
        cycleNo,
        recipientUserId: schedule.recipient_user_id,
        amount: payoutAmount,
        memberCount,
        executionMode: "supabase-admin",
      },
    });

    if (auditError) {
      console.error("Audit log insert failed:", auditError);
    }

    // 10) Notification
    const { error: notifError } = await supabaseAdmin.from("notifications").insert({
      user_auth_id: schedule.recipient_user_id,
      title: "Payout Completed",
      message: `Your payout for cycle ${cycleNo} in circle "${circle.name}" has been completed.`,
      read: false,
    });

    if (notifError) {
      console.error("Notification creation failed:", notifError);
    }

    return NextResponse.json(
      {
        message: "Payout executed successfully",
        payout,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to execute payout.",
      },
      { status: 401 }
    );
  }
}