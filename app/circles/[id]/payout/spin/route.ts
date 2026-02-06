import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireUserId, monthKeyNow } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminId = requireUserId(req);
    const circleId = Number(params.id);
    const monthKey = monthKeyNow();

    // admin only
    const adminCheck = await pool.query(
      `SELECT 1 FROM circle_members
       WHERE circle_id=$1 AND user_id=$2 AND role='ADMIN' AND status='APPROVED'`,
      [circleId, adminId]
    );
    if (adminCheck.rowCount === 0) {
      return NextResponse.json({ message: "Admin only" }, { status: 403 });
    }

    // already spun this month?
    const existing = await pool.query(
      `SELECT 1 FROM payouts WHERE circle_id=$1 AND month_key=$2`,
      [circleId, monthKey]
    );
    if (existing.rowCount > 0) {
      return NextResponse.json({ message: "Payout already selected this month" }, { status: 409 });
    }

    // eligible members (approved)
    const m = await pool.query(
      `SELECT u.id, u.full_name, u.email
       FROM circle_members cm
       JOIN users u ON u.id=cm.user_id
       WHERE cm.circle_id=$1 AND cm.status='APPROVED'
       ORDER BY u.id`,
      [circleId]
    );
    if (m.rows.length < 1) {
      return NextResponse.json({ message: "No members" }, { status: 400 });
    }

    const winner = m.rows[Math.floor(Math.random() * m.rows.length)];

    await pool.query(
      `INSERT INTO payouts(circle_id, month_key, winner_user_id, created_by)
       VALUES ($1,$2,$3,$4)`,
      [circleId, monthKey, winner.id, adminId]
    );

    return NextResponse.json({ monthKey, winner });
  } catch (e: any) {
    return NextResponse.json({ message: e.message || "Server error" }, { status: 500 });
  }
}
