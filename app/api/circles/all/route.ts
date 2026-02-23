import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireUserId } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * Returns all circles, plus the current user's membership status (if any).
 * myStatus: "NONE" | "PENDING" | "APPROVED" | "REJECTED"
 */
export async function GET(req: NextRequest) {
  try {
    const userId = requireUserId(req);

    const q = await pool.query(
      `
      SELECT
        c.id,
        c.owner_id,
        c.name,
        c.contribution_amount,
        c.created_at,
        COALESCE(cm.status, 'NONE') AS my_status
      FROM circles c
      LEFT JOIN circle_members cm
        ON cm.circle_id = c.id AND cm.user_id = $1
      ORDER BY c.created_at DESC
      `,
      [userId]
    );

    return NextResponse.json({ circles: q.rows });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}