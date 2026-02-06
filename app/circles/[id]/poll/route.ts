import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireUserId, monthKeyNow } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    requireUserId(req);
    const circleId = Number(params.id);
    const monthKey = monthKeyNow();

    const pollRes = await pool.query(
      `SELECT * FROM payout_polls WHERE circle_id=$1 AND month_key=$2`,
      [circleId, monthKey]
    );
    const poll = pollRes.rows[0] || null;
    if (!poll) return NextResponse.json({ monthKey, poll: null, results: [] });

    const results = await pool.query(
      `SELECT v.nominee_user_id, u.full_name, u.email, COUNT(*)::int as votes
       FROM payout_poll_votes v
       JOIN users u ON u.id=v.nominee_user_id
       WHERE v.poll_id=$1
       GROUP BY v.nominee_user_id, u.full_name, u.email
       ORDER BY votes DESC`,
      [poll.id]
    );

    return NextResponse.json({ monthKey, poll, results: results.rows });
  } catch (e: any) {
    return NextResponse.json({ message: e.message || "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = requireUserId(req);
    const circleId = Number(params.id);
    const monthKey = monthKeyNow();
    const body = await req.json();

    const action = body.action;

    // Admin check helper
    const adminCheck = await pool.query(
      `SELECT 1 FROM circle_members
       WHERE circle_id=$1 AND user_id=$2 AND role='ADMIN' AND status='APPROVED'`,
      [circleId, userId]
    );
    const isAdmin = adminCheck.rowCount > 0;

    if (action === "create") {
      if (!isAdmin) return NextResponse.json({ message: "Admin only" }, { status: 403 });

      await pool.query(
        `INSERT INTO payout_polls(circle_id, month_key, created_by)
         VALUES($1,$2,$3)
         ON CONFLICT (circle_id, month_key) DO NOTHING`,
        [circleId, monthKey, userId]
      );
      return NextResponse.json({ message: "Poll ready", monthKey });
    }

    if (action === "close") {
      if (!isAdmin) return NextResponse.json({ message: "Admin only" }, { status: 403 });
      await pool.query(
        `UPDATE payout_polls
         SET status='CLOSED', closed_at=NOW()
         WHERE circle_id=$1 AND month_key=$2`,
        [circleId, monthKey]
      );
      return NextResponse.json({ message: "Poll closed" });
    }

    if (action === "vote") {
      const nomineeUserId = Number(body.nomineeUserId);
      if (!nomineeUserId) return NextResponse.json({ message: "Pick a nominee" }, { status: 400 });

      const pollRes = await pool.query(
        `SELECT * FROM payout_polls WHERE circle_id=$1 AND month_key=$2`,
        [circleId, monthKey]
      );
      const poll = pollRes.rows[0];
      if (!poll) return NextResponse.json({ message: "Poll not created" }, { status: 404 });
      if (poll.status !== "OPEN") return NextResponse.json({ message: "Poll closed" }, { status: 409 });

      // must be approved member
      const memberCheck = await pool.query(
        `SELECT 1 FROM circle_members WHERE circle_id=$1 AND user_id=$2 AND status='APPROVED'`,
        [circleId, userId]
      );
      if (memberCheck.rowCount === 0) return NextResponse.json({ message: "Not a member" }, { status: 403 });

      await pool.query(
        `INSERT INTO payout_poll_votes(poll_id, voter_user_id, nominee_user_id)
         VALUES($1,$2,$3)
         ON CONFLICT (poll_id, voter_user_id) DO UPDATE
         SET nominee_user_id=EXCLUDED.nominee_user_id, created_at=NOW()`,
        [poll.id, userId, nomineeUserId]
      );

      return NextResponse.json({ message: "Voted" });
    }

    return NextResponse.json({ message: "Invalid action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ message: e.message || "Server error" }, { status: 500 });
  }
}
