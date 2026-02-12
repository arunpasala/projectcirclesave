import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireUserId } from "@/lib/auth";

export const runtime = "nodejs";

type Decision = "APPROVE" | "REJECT" | "REMOVE";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const actorId = requireUserId(req);
    const { id } = await ctx.params;

    const circleId = Number(id);
    if (!Number.isFinite(circleId)) {
      return NextResponse.json({ error: "Invalid circle id" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const userId = Number(body?.userId);
    const decision = String(body?.decision || "").toUpperCase() as Decision;

    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }
    if (!["APPROVE", "REJECT", "REMOVE"].includes(decision)) {
      return NextResponse.json(
        { error: "decision must be APPROVE, REJECT, or REMOVE" },
        { status: 400 }
      );
    }

    // Must be circle owner OR ADMIN in circle_members
    const permRes = await pool.query(
      `SELECT
         c.owner_id,
         (SELECT role FROM circle_members WHERE circle_id=$1 AND user_id=$2) AS actor_role
       FROM circles c
       WHERE c.id = $1`,
      [circleId, actorId]
    );

    if (permRes.rowCount === 0) {
      return NextResponse.json({ error: "Circle not found" }, { status: 404 });
    }

    const ownerId = Number(permRes.rows[0].owner_id);
    const actorRole = String(permRes.rows[0].actor_role || "").toUpperCase();

    const isOwner = ownerId === actorId;
    const isAdmin = actorRole === "ADMIN";

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (decision === "REMOVE" && userId === ownerId) {
      return NextResponse.json(
        { error: "Cannot remove the circle owner" },
        { status: 400 }
      );
    }

    if (decision === "APPROVE") {
      const r = await pool.query(
        `UPDATE circle_members
         SET status='APPROVED', decided_at=NOW(), decided_by=$3
         WHERE circle_id=$1 AND user_id=$2
         RETURNING circle_id, user_id, status, role`,
        [circleId, userId, actorId]
      );
      if (r.rowCount === 0) {
        return NextResponse.json({ error: "Membership not found" }, { status: 404 });
      }
      return NextResponse.json({ member: r.rows[0] });
    }

    if (decision === "REJECT") {
      const r = await pool.query(
        `UPDATE circle_members
         SET status='REJECTED', decided_at=NOW(), decided_by=$3
         WHERE circle_id=$1 AND user_id=$2
         RETURNING circle_id, user_id, status, role`,
        [circleId, userId, actorId]
      );
      if (r.rowCount === 0) {
        return NextResponse.json({ error: "Membership not found" }, { status: 404 });
      }
      return NextResponse.json({ member: r.rows[0] });
    }

    // REMOVE
    const del = await pool.query(
      `DELETE FROM circle_members
       WHERE circle_id=$1 AND user_id=$2
       RETURNING circle_id, user_id`,
      [circleId, userId]
    );
    if (del.rowCount === 0) {
      return NextResponse.json({ error: "Membership not found" }, { status: 404 });
    }
    return NextResponse.json({ removed: del.rows[0] });
  } catch (e: any) {
    const msg = e?.message || "Server error";
    const status = msg === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
