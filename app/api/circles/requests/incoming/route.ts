import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const ownerId = requireUserId(req);

    const res = await pool.query(
      `
      SELECT
        cm.id AS membership_id,
        cm.circle_id,
        c.name AS circle_name,
        cm.user_id AS requester_user_id,
        u.email AS requester_email,
        u.full_name AS requester_name,
        cm.requested_at
      FROM circle_members cm
      JOIN circles c ON c.id = cm.circle_id
      JOIN users u ON u.id = cm.user_id
      WHERE c.owner_id = $1
        AND cm.status = 'PENDING'
      ORDER BY cm.requested_at DESC
      `,
      [ownerId]
    );

    return NextResponse.json({ requests: res.rows });
  } catch (e: any) {
    console.error("INCOMING_REQUESTS_ERROR:", e);
    return NextResponse.json(
      { error: "Failed to fetch incoming requests", details: String(e?.message || e) },
      { status: 500 }
    );
  }
}