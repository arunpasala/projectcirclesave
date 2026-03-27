import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, context: RouteContext) {
  const client = await pool.connect();

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

    const { id } = await context.params;
    const circleId = Number(id);
    const body = await req.json();
    const cycleNo = Number(body?.cycleNo);

    if (!Number.isInteger(circleId) || circleId <= 0) {
      return NextResponse.json({ error: "Invalid circle id" }, { status: 400 });
    }

    if (!Number.isInteger(cycleNo) || cycleNo <= 0) {
      return NextResponse.json({ error: "Invalid cycle number" }, { status: 400 });
    }

    await client.query("BEGIN");

    // 1) Load circle and verify owner
    const circleRes = await client.query(
      `
      select id, owner_auth_id, name, contribution_amount
      from public.circles
      where id = $1
      `,
      [circleId]
    );

    if (!circleRes.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Circle not found" }, { status: 404 });
    }

    const circle = circleRes.rows[0];

    if (circle.owner_auth_id !== user.id) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Only the circle owner can execute payout" },
        { status: 403 }
      );
    }

    // 2) Lock payout schedule row for this cycle
    const scheduleRes = await client.query(
      `
      select id, recipient_user_id, status
      from public.payout_schedule
      where circle_id = $1 and cycle_no = $2
      for update
      `,
      [circleId, cycleNo]
    );

    if (!scheduleRes.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Payout schedule not found for this cycle" },
        { status: 404 }
      );
    }

    const schedule = scheduleRes.rows[0];

    if (schedule.status === "PAID") {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Payout already completed for this cycle" },
        { status: 409 }
      );
    }

    if (schedule.status !== "READY") {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: `Payout is not ready. Current status: ${schedule.status}` },
        { status: 400 }
      );
    }

    // 3) Count approved members
    const memberCountRes = await client.query(
      `
      select count(*)::int as member_count
      from public.circle_members
      where circle_id = $1 and status = 'APPROVED'
      `,
      [circleId]
    );

    const memberCount = memberCountRes.rows[0]?.member_count ?? 0;

    if (memberCount <= 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "No approved members found" },
        { status: 400 }
      );
    }

    // 4) Count contributions for this cycle
    const contributionsRes = await client.query(
      `
      select count(*)::int as paid_count
      from public.contributions
      where circle_id = $1 and cycle_no = $2
      `,
      [circleId, cycleNo]
    );

    const paidCount = contributionsRes.rows[0]?.paid_count ?? 0;

    if (paidCount !== memberCount) {
      await client.query("ROLLBACK");
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
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Invalid payout amount" },
        { status: 400 }
      );
    }

    // 6) Insert payout row
    const payoutInsertRes = await client.query(
      `
      insert into public.payouts
        (circle_id, cycle_no, recipient_user_id, amount, status)
      values
        ($1, $2, $3, $4, 'COMPLETED')
      returning *
      `,
      [circleId, cycleNo, schedule.recipient_user_id, payoutAmount]
    );

    const payout = payoutInsertRes.rows[0];

    // 7) Mark schedule as paid
    await client.query(
      `
      update public.payout_schedule
      set status = 'PAID'
      where id = $1
      `,
      [schedule.id]
    );

    // 8) Audit log
    await client.query(
      `
      insert into public.audit_logs
        (actor_user_id, action_type, circle_id, target_id, metadata)
      values
        ($1, 'PAYOUT_EXECUTED', $2, $3, $4::jsonb)
      `,
      [
        user.id,
        circleId,
        payout.id,
        JSON.stringify({
          cycleNo,
          recipientUserId: schedule.recipient_user_id,
          amount: payoutAmount,
          memberCount,
          executionMode: "transaction_for_update",
        }),
      ]
    );

    await client.query("COMMIT");

    // 9) Post-commit notification
    try {
      await pool.query(
        `
        insert into public.notifications
          (user_auth_id, title, message, read, created_at)
        values
          ($1, $2, $3, false, now())
        `,
        [
          schedule.recipient_user_id,
          "Payout Completed",
          `Your payout for cycle ${cycleNo} in circle "${circle.name}" has been completed.`,
        ]
      );
    } catch (notificationError) {
      console.error("Notification creation failed after commit:", notificationError);
    }

    return NextResponse.json(
      {
        message: "Payout executed successfully",
        payout,
      },
      { status: 201 }
    );
  } catch (error: any) {
    try {
      await client.query("ROLLBACK");
    } catch {}

    if (error?.code === "23505") {
      return NextResponse.json(
        { error: "Duplicate payout prevented by database constraint" },
        { status: 409 }
      );
    }

    console.error("POST /api/circles/[id]/payouts error:", error);
    return NextResponse.json(
      { error: error?.message || "Server error" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}