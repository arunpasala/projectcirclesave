import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(
    req: NextRequest,
    ctx: { params: Promise<{ id: string }> }
) {
    try {
        const userId = requireUserId(req);
        const { id } = await ctx.params;

        const circleId = Number(id);
        if (!Number.isFinite(circleId)) {
            return NextResponse.json({ error: "Invalid circle id" }, { status: 400 });
        }

        // Load circle + owner
        const circleRes = await pool.query(
            `SELECT id, owner_id, name, contribution_amount, created_at
       FROM circles
       WHERE id = $1`,
            [circleId]
        );

        if (circleRes.rowCount === 0) {
            return NextResponse.json({ error: "Circle not found" }, { status: 404 });
        }

        const circle = circleRes.rows[0];
        const isOwner = circle.owner_id === userId;

        // Members list
        const membersRes = await pool.query(
            `SELECT
          cm.user_id,
          COALESCE(u.full_name, '') AS full_name,
          u.email,
          cm.role,
          cm.status,
          cm.joined_at
       FROM circle_members cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.circle_id = $1
       ORDER BY
          CASE cm.status WHEN 'PENDING' THEN 0 ELSE 1 END,
          cm.joined_at ASC`,
            [circleId]
        );

        return NextResponse.json({
            circle: { ...circle, isOwner },
            members: membersRes.rows,
        });
    } catch (e: any) {
        const msg = e?.message || "Server error";
        const status = msg === "Unauthorized" ? 401 : 500;
        return NextResponse.json({ error: msg }, { status });
    }
}
