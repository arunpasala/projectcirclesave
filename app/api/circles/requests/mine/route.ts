import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const userId = requireUserId(req);

    const res = await pool.query(
      `
      SELECT
        cm.circle_id,
        c.name AS circle_name,
        cm.status,
        cm.requested_at
      FROM circle_members cm
      JOIN circles c ON c.id = cm.circle_id
      WHERE cm.user_id = $1
        AND cm.status IN ('PENDING', 'APPROVED', 'REJECTED')
      ORDER BY cm.requested_at DESC
      `,
      [userId]
    );

    return NextResponse.json({
      requested: res.rows.map((r) => ({
        circle_id: r.circle_id,
        circle_name: r.circle_name,
        status: String(r.status || "").toLowerCase(), // -> "pending" | "approved" | "rejected"
        created_at: r.requested_at, // keep your dashboard type stable
      })),
    });
  } catch (e: any) {
    console.error("MY_REQUESTS_ERROR:", e);
    return NextResponse.json(
      { error: "Failed to fetch requested circles", details: String(e?.message || e) },
      { status: 500 }
    );
  }
}