import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireUserId, monthKeyNow } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireUserId(req); // any logged in member can view (MVP)
    const circleId = Number(params.id);
    const monthKey = monthKeyNow();

    const p = await pool.query(
      `SELECT p.id, p.month_key, p.created_at, u.full_name, u.email
       FROM payouts p
       JOIN users u ON u.id=p.winner_user_id
       WHERE p.circle_id=$1 AND p.month_key=$2`,
      [circleId, monthKey]
    );

    return NextResponse.json({ monthKey, payout: p.rows[0] || null });
  } catch (e: any) {
    return NextResponse.json({ message: e.message || "Unauthorized" }, { status: 401 });
  }
}
