import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const userId = requireUserId(req);

    const { rows } = await pool.query(
      `SELECT cm.id as membership_id, cm.circle_id, c.name as circle_name,
              u.id as user_id, u.email, u.full_name, cm.requested_at
       FROM circle_members cm
       JOIN circles c ON c.id = cm.circle_id
       JOIN users u ON u.id = cm.user_id
       WHERE cm.status='PENDING' AND c.owner_id=$1
       ORDER BY cm.requested_at DESC`,
      [userId]
    );

    return NextResponse.json({ requests: rows });
  } catch (e: any) {
    if (e?.message === "UNAUTHORIZED") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
