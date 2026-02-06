import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const userId = requireUserId(req);
    const url = new URL(req.url);
    const circleId = Number(url.searchParams.get("circleId"));

    if (!circleId) return NextResponse.json({ message: "circleId required" }, { status: 400 });

    // check access: owner OR approved member
    const access = await pool.query(
      `SELECT 1
       FROM circles c
       LEFT JOIN circle_members cm
         ON cm.circle_id=c.id AND cm.user_id=$2 AND cm.status='APPROVED'
       WHERE c.id=$1 AND (c.owner_id=$2 OR cm.id IS NOT NULL)`,
      [circleId, userId]
    );
    if (!access.rowCount) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const { rows } = await pool.query(
      `SELECT u.id, u.full_name, u.email, cm.role, cm.status, cm.joined_at
       FROM circle_members cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.circle_id=$1 AND cm.status='APPROVED'
       ORDER BY cm.joined_at ASC`,
      [circleId]
    );

    return NextResponse.json({ members: rows });
  } catch (e: any) {
    if (e?.message === "UNAUTHORIZED") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
