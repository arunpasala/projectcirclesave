import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const adminId = getUserIdFromRequest(req);
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const circleId = Number(body.circleId);
  const memberUserId = Number(body.userId);
  const decision = String(body.decision || "").toUpperCase(); // APPROVE | REJECT

  if (!circleId || !memberUserId || !["APPROVE", "REJECT"].includes(decision)) {
    return NextResponse.json(
      { error: "circleId, userId, decision(APPROVE|REJECT) required" },
      { status: 400 }
    );
  }

  // Must be circle owner (ADMIN)
  const ownerCheck = await pool.query(
    "SELECT 1 FROM circles WHERE id=$1 AND owner_id=$2",
    [circleId, adminId]
  );
  if (ownerCheck.rowCount === 0)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const newStatus = decision === "APPROVE" ? "APPROVED" : "REJECTED";

  const updated = await pool.query(
    `
    UPDATE circle_members
    SET status=$1, decided_at=NOW(), decided_by=$2
    WHERE circle_id=$3 AND user_id=$4 AND status='PENDING'
    RETURNING id, circle_id, user_id, status
    `,
    [newStatus, adminId, circleId, memberUserId]
  );

  if (updated.rowCount === 0) {
    return NextResponse.json({ error: "No pending request found" }, { status: 404 });
  }

  return NextResponse.json({ membership: updated.rows[0] });
}
