import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getUserIdFromAuthHeader } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const adminId = getUserIdFromAuthHeader(req);
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const circleId = Number(params.id);
  if (!Number.isFinite(circleId)) return NextResponse.json({ error: "Invalid circle id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const targetUserId = Number(body?.userId);
  const decision = String(body?.decision || "").toUpperCase(); // APPROVE | REJECT | REMOVE

  if (!Number.isFinite(targetUserId)) return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
  if (!["APPROVE", "REJECT", "REMOVE"].includes(decision))
    return NextResponse.json({ error: "Invalid decision" }, { status: 400 });

  // Only OWNER can decide
  const ownerCheck = await pool.query(
    "SELECT 1 FROM circles WHERE id = $1 AND owner_id = $2",
    [circleId, adminId]
  );
  if (ownerCheck.rowCount === 0) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // REMOVE = delete membership row
  if (decision === "REMOVE") {
    // prevent owner removing themselves (optional safeguard)
    const circle = await pool.query("SELECT owner_id FROM circles WHERE id = $1", [circleId]);
    if (circle.rows?.[0]?.owner_id === targetUserId) {
      return NextResponse.json({ error: "Owner cannot be removed" }, { status: 400 });
    }

    const del = await pool.query(
      "DELETE FROM circle_members WHERE circle_id = $1 AND user_id = $2 RETURNING user_id",
      [circleId, targetUserId]
    );
    if (del.rowCount === 0) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    return NextResponse.json({ ok: true });
  }

  // APPROVE/REJECT = update status + audit fields
  const newStatus = decision === "APPROVE" ? "APPROVED" : "REJECTED";

  const upd = await pool.query(
    `
    UPDATE circle_members
    SET status = $1,
        decided_at = NOW(),
        decided_by = $2
    WHERE circle_id = $3 AND user_id = $4
    RETURNING user_id, status
    `,
    [newStatus, adminId, circleId, targetUserId]
  );

  if (upd.rowCount === 0) return NextResponse.json({ error: "Join request not found" }, { status: 404 });

  return NextResponse.json({ ok: true, member: upd.rows[0] });
}
