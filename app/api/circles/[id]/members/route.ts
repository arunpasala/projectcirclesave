import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ circleId: string }> }
) {
  try {
    const userId = requireUserId(req);
    const { circleId } = await context.params;
    const id = Number(circleId);

    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "Invalid circleId" }, { status: 400 });
    }

    // Check circle + access (owner OR approved member)
    const circleRes = await pool.query(
      `SELECT owner_id FROM circles WHERE id = $1`,
      [id]
    );
    if (circleRes.rowCount === 0) {
      return NextResponse.json({ error: "Circle not found" }, { status: 404 });
    }

    const ownerId = circleRes.rows[0].owner_id;

    const memberAccessRes = await pool.query(
      `SELECT 1
       FROM circle_members
       WHERE circle_id = $1 AND user_id = $2 AND status = 'APPROVED'
       LIMIT 1`,
      [id, userId]
    );

    const isOwner = ownerId === userId;
    const isMember = memberAccessRes.rowCount > 0;

    if (!isOwner && !isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const membersRes = await pool.query(
      `SELECT
         cm.user_id,
         COALESCE(u.full_name, split_part(u.email, '@', 1)) AS full_name,
         u.email,
         cm.role,
         cm.status,
         cm.joined_at
       FROM circle_members cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.circle_id = $1
       ORDER BY
         CASE WHEN cm.role = 'ADMIN' THEN 0 ELSE 1 END,
         cm.joined_at ASC`,
      [id]
    );

    return NextResponse.json({ members: membersRes.rows });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
