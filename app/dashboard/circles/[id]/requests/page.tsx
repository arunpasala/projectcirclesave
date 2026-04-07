import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromAuthHeader(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const circleId = Number(id);

    if (!Number.isFinite(circleId)) {
      return NextResponse.json({ error: "Invalid circle id" }, { status: 400 });
    }

    // Only circle owner can view pending join requests
    const ownerCheck = await pool.query(
      "SELECT 1 FROM circles WHERE id = $1 AND owner_id = $2",
      [circleId, userId]
    );

    if (ownerCheck.rowCount === 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await pool.query(
      `
      SELECT
        cm.user_id,
        u.full_name,
        u.email,
        cm.role,
        cm.status,
        cm.requested_at
      FROM circle_members cm
      JOIN users u ON u.id = cm.user_id
      WHERE cm.circle_id = $1
        AND cm.status = 'PENDING'
      ORDER BY cm.requested_at ASC
      `,
      [circleId]
    );

    return NextResponse.json({ requests: result.rows }, { status: 200 });
  } catch (error) {
    console.error("GET /api/circles/[id]/requests error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}