import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const ownerId = requireUserId(req);

    const r = await pool.query(
      `
      SELECT
        cm.id as request_id,
        cm.circle_id,
        c.name as circle_name,
        cm.user_id as requester_id,
        u.email as requester_email,
        COALESCE(u.full_name,'') as requester_name,
        cm.requested_at,
        cm.status
      FROM circle_members cm
      JOIN circles c ON c.id = cm.circle_id
      JOIN users u ON u.id = cm.user_id
      WHERE c.owner_id = $1 AND cm.status = 'PENDING'
      ORDER BY cm.requested_at DESC
      `,
      [ownerId]
    );

    return NextResponse.json({ requests: r.rows });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}