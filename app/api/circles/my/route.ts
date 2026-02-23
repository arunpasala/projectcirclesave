import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const userId = requireUserId(req);

    const r = await pool.query(
      `
      SELECT
        c.id,
        c.owner_id,
        c.name,
        c.contribution_amount,
        c.created_at,
        cm.status
      FROM circle_members cm
      JOIN circles c ON c.id = cm.circle_id
      WHERE cm.user_id = $1
      ORDER BY cm.requested_at DESC
      `,
      [userId]
    );

    return NextResponse.json({ circles: r.rows });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}