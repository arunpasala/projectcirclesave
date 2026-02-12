import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireUserId } from "@/lib/auth";

export const runtime = "nodejs";

type Decision = "APPROVE" | "REJECT" | "REMOVE";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actorId = requireUserId(req);

    const { id } = await params; // ✅ Next.js 16 fix
    const circleId = Number(id);
    if (!Number.isFinite(circleId)) {
      return NextResponse.json({ error: "Invalid circle id" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const targetUserId = Number(body?.userId);
    const decision = String(body?.decision || "").toUpperCase() as Decision;

    if (!Number.isFinite(targetUserId)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }
    if (!["APPROVE", "REJECT", "REMOVE"].includes(decision)) {
      return NextResponse.json(
        { error: "decision must be APPROVE | REJECT | REMOVE" },
        { status: 400 }
      );
    }

    // Only circle owner can decide
    const circleRes = await pool.query(
      `SELECT owner_id FROM circles WHERE id = $1`,
      [circleId]
    );
    if (circleRes.rowCount === 0) {
      return NextResponse.json({ error: "Circle not found" }, { status: 404 });
    }

    const ownerId = Number(circleRes.rows[0].owner_id);
    if (ownerId !== Number(actorId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // must exist
    const cmRes = await pool.query(
      `SELECT id, status, role FROM circle_members
       WHERE circle_id = $1 AND user_id = $2`,
      [circleId, targetUserId]
    );
    if (cmRes.rowCount === 0) {
      return NextResponse.json(
        { error: "User is not in this circle (no request found)" },
        { status: 404 }
      );
    }

    // optional: never remove owner row
    if (targetUserId === ownerId && decision === "REMOVE") {
      return NextResponse.json(
        { error: "Cannot remove circle owner" },
        { status: 400 }
      );
    }

    if (decision === "REMOVE") {
      await pool.query(
        `DELETE FROM circle_members
         WHERE circle_id = $1 AND user_id = $2`,
        [circleId, targetUserId]
      );
      return NextResponse.json({ ok: true, action: "REMOVED" });
    }

    const newStatus = decision === "APPROVE" ? "APPROVED" : "REJECTED";

    const upd = await pool.query(
      `UPDATE circle_members
       SET status = $1,
           decided_at = NOW(),
           decided_by = $2
       WHERE circle_id = $3 AND user_id = $4
       RETURNING circle_id, user_id, role, status, decided_at, decided_by`,
      [newStatus, actorId, circleId, targetUserId]
    );

    return NextResponse.json({
      ok: true,
      action: decision,
      member: upd.rows[0],
    });
  } catch (err: any) {
    if (err?.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/circles/[id]/members/decision error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
