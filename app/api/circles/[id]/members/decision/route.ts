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

    // Circle exists?
    const circleRes = await pool.query(
      `SELECT id, owner_id, name, contribution_amount, created_at
       FROM circles
       WHERE id = $1`,
      [id]
    );
    if (circleRes.rowCount === 0) {
      return NextResponse.json({ error: "Circle not found" }, { status: 404 });
    }

    // Must be owner OR approved member to view circle details page
    const accessRes = await pool.query(
      `SELECT 1
       FROM circle_members
       WHERE circle_id = $1
         AND user_id = $2
         AND status = 'APPROVED'
       LIMIT 1`,
      [id, userId]
    );

    const circle = circleRes.rows[0];
    const isOwner = circle.owner_id === userId;
    const isMember = accessRes.rowCount > 0;

    if (!isOwner && !isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      circle: {
        ...circle,
        isOwner,
      },
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
