import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getUserIdFromAuthHeader } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const userId = getUserIdFromAuthHeader(req);
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const circleId = Number(params.id);
        if (!Number.isFinite(circleId)) {
            return NextResponse.json({ error: "Invalid circle id" }, { status: 400 });
        }

        // Must be a member (pending/approved) or owner to view members
        const access = await pool.query(
            `
      SELECT
        c.owner_id,
        EXISTS (
          SELECT 1 FROM circle_members cm
          WHERE cm.circle_id = c.id AND cm.user_id = $2
        ) AS is_member
      FROM circles c
      WHERE c.id = $1
      `,
            [circleId, userId]
        );

        if (access.rowCount === 0) {
            return NextResponse.json({ error: "Circle not found" }, { status: 404 });
        }

        const { owner_id, is_member } = access.rows[0] as {
            owner_id: number;
            is_member: boolean;
        };

        if (!is_member && owner_id !== userId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const membersRes = await pool.query(
            `
      SELECT
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
        CASE cm.status WHEN 'PENDING' THEN 0 WHEN 'APPROVED' THEN 1 ELSE 2 END,
        cm.joined_at ASC
      `,
            [circleId]
        );

        return NextResponse.json({ members: membersRes.rows });
    } catch (err) {
        console.error("GET /api/circles/[id]/members error:", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
