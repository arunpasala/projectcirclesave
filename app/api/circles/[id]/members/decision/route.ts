import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getUserIdFromAuthHeader } from "@/lib/auth";

export const runtime = "nodejs";

type Decision = "APPROVE" | "REJECT" | "REMOVE";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const actorId = getUserIdFromAuthHeader(req);
    if (!actorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const circleId = Number(params.id);
    if (!Number.isFinite(circleId)) {
      return NextResponse.json({ error: "Invalid circle id" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const userId = Number(body?.userId);
    const decision = String(body?.decision || "").toUpperCase() as Decision;

    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }
    if (!["APPROVE", "REJECT", "REMOVE"].includes(decision)) {
      return NextResponse.json(
        { error: "Decision must be APPROVE, REJECT, or REMOVE" },
        { status: 400 }
      );
    }

    // Only owner OR an ADMIN in that circle can decide
    const perm = await pool.query(
      `
      SELECT
        c.owner_id,
        (SELECT cm.role FROM circle_members cm WHERE cm.circle_id = c.id AND cm.user_id = $2) AS actor_role
      FROM circles c
      WHERE c.id = $1
      `,
      [circleId, actorId]
    );

    if (perm.rowCount === 0) {
      return NextResponse.json({ error: "Circle not found" }, { status: 404 });
    }

    const { owner_id, actor_role } = perm.rows[0] as {
      owner_id: number;
      actor_role: string | null;
    };

    const isOwner = owner_id === actorId;
    const isAdmin = actor_role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Don’t allow removing/deciding on the owner
    if (userId === owner_id) {
      return NextResponse.json(
        { error: "You cannot modify the circle owner." },
        { status: 400 }
      );
    }

    // Ensure target exists in circle
    const target = await pool.query(
      `SELECT status, role FROM circle_members WHERE circle_id=$1 AND user_id=$2`,
      [circleId, userId]
    );
    if (target.rowCount === 0) {
      return NextResponse.json(
        { error: "User is not in this circle" },
        { status: 404 }
      );
    }

    // Admins shouldn't be able to remove another ADMIN (optional safety)
    const targetRole = target.rows[0]?.role as string;
    if (!isOwner && targetRole === "ADMIN") {
      return NextResponse.json(
        { error: "Only owner can modify an ADMIN." },
        { status: 403 }
      );
    }

    if (decision === "REMOVE") {
      await pool.query(
        `DELETE FROM circle_members WHERE circle_id=$1 AND user_id=$2`,
        [circleId, userId]
      );
      return NextResponse.json({ message: "Member removed" });
    }

    // APPROVE / REJECT
    const newStatus = decision === "APPROVE" ? "APPROVED" : "REJECTED";

    await pool.query(
      `
      UPDATE circle_members
      SET
        status = $3,
        decided_at = NOW(),
        decided_by = $4,
        -- set joined_at when approved
        joined_at = CASE WHEN $3='APPROVED' THEN NOW() ELSE joined_at END
      WHERE circle_id = $1 AND user_id = $2
      `,
      [circleId, userId, newStatus, actorId]
    );

    return NextResponse.json({ message: `Member ${newStatus.toLowerCase()}` });
  } catch (err) {
    console.error("POST /api/circles/[id]/members/decision error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
