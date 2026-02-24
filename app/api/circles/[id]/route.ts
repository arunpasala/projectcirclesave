import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userId = requireUserId(req);

    const { id } = await context.params;
    const circleId = Number(id);

    if (!Number.isFinite(circleId) || circleId <= 0) {
      return NextResponse.json({ error: "Invalid circle id" }, { status: 400 });
    }

    // Check circle exists and user has access (OWNER or approved MEMBER)
    const accessRes = await pool.query(
      `
      SELECT 
        c.id,
        c.owner_id,
        EXISTS(
          SELECT 1
          FROM circle_members cm
          WHERE cm.circle_id=c.id
            AND cm.user_id=$2
            AND cm.status='APPROVED'
        ) AS is_member
      FROM circles c
      WHERE c.id=$1
      `,
      [circleId, userId]
    );

    if (accessRes.rowCount === 0) {
      return NextResponse.json({ error: "Circle not found" }, { status: 404 });
    }

    const c = accessRes.rows[0];
    const isOwner = Number(c.owner_id) === userId;
    const isMember = Boolean(c.is_member);

    if (!isOwner && !isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ✅ IMPORTANT: Join users table to get full_name + email
    const result = await pool.query(
      `
      SELECT 
        cm.user_id,
        COALESCE(NULLIF(TRIM(u.full_name), ''), '') AS full_name,
        u.email,
        cm.role,
        cm.status,
        cm.joined_at
      FROM circle_members cm
      JOIN users u ON u.id = cm.user_id
      WHERE cm.circle_id=$1
      ORDER BY cm.joined_at ASC
      `,
      [circleId]
    );

    return NextResponse.json({ members: result.rows });
  } catch (e: any) {
    console.error("CIRCLE_MEMBERS_ERROR:", e);
    return NextResponse.json(
      { error: "Server error", details: String(e?.message || e) },
      { status: 500 }
    );
  }
}