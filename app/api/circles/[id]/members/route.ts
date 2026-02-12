import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userId = requireUserId(req);

        const { id } = await params; // ✅ Next.js 16 fix
        const circleId = Number(id);
        if (!Number.isFinite(circleId)) {
            return NextResponse.json({ error: "Invalid circle id" }, { status: 400 });
        }

        // Check circle exists + who owns it
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

        // Owner can see everyone (including pending + emails)
        const isOwner = Number(circle.owner_id) === Number(userId);

        // Non-owner must be an APPROVED member to see member list
        if (!isOwner) {
            const memCheck = await pool.query(
                `SELECT 1
         FROM circle_members
         WHERE circle_id = $1 AND user_id = $2 AND status = 'APPROVED'`,
                [circleId, userId]
            );
            if (memCheck.rowCount === 0) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
        }

        // Members list:
        // - owner: all members
        // - non-owner: only approved, and hide email
        const membersRes = await pool.query(
            isOwner
                ? `SELECT
             cm.user_id,
             COALESCE(u.full_name, '') AS full_name,
             u.email,
             cm.role,
             cm.status,
             cm.joined_at
           FROM circle_members cm
           JOIN users u ON u.id = cm.user_id
           WHERE cm.circle_id = $1
           ORDER BY cm.status ASC, cm.joined_at ASC`
                : `SELECT
             cm.user_id,
             COALESCE(u.full_name, '') AS full_name,
             '' AS email,
             cm.role,
             cm.status,
             cm.joined_at
           FROM circle_members cm
           JOIN users u ON u.id = cm.user_id
           WHERE cm.circle_id = $1 AND cm.status = 'APPROVED'
           ORDER BY cm.joined_at ASC`,
            [circleId]
        );

        return NextResponse.json({
            circle: { ...circle, isOwner },
            members: membersRes.rows,
        });
    } catch (err: any) {
        // requireUserId throws "Unauthorized"
        if (err?.message === "Unauthorized") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        console.error("GET /api/circles/[id]/members error:", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
