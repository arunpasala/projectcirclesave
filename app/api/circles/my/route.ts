import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const userId = requireUserId(req);

    // circles you own OR you are an APPROVED member of
    const { rows } = await pool.query(
      `
      SELECT DISTINCT c.id, c.owner_id, c.name, c.contribution_amount, c.created_at
      FROM circles c
      LEFT JOIN circle_members cm
        ON cm.circle_id = c.id
       AND cm.user_id = $1
       AND cm.status = 'APPROVED'
      WHERE c.owner_id = $1 OR cm.user_id = $1
      ORDER BY c.created_at DESC
      `,
      [userId]
    );

    return NextResponse.json({ circles: rows });
  } catch (e: any) {
    if (e?.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/circles/my error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
