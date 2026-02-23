import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const ownerId = requireUserId(req);
    const { requestId, decision } = await req.json();

    const rid = Number(requestId);
    const dec = String(decision || "").toUpperCase();

    if (!Number.isFinite(rid) || rid <= 0) {
      return NextResponse.json({ error: "Invalid requestId" }, { status: 400 });
    }
    if (dec !== "APPROVE" && dec !== "REJECT") {
      return NextResponse.json({ error: "Decision must be APPROVE or REJECT" }, { status: 400 });
    }

    const row = await pool.query(
      `
      SELECT
        cm.id,
        cm.circle_id,
        cm.user_id as requester_id,
        cm.status,
        c.owner_id,
        c.name as circle_name
      FROM circle_members cm
      JOIN circles c ON c.id = cm.circle_id
      WHERE cm.id=$1
      `,
      [rid]
    );

    if (row.rowCount === 0) return NextResponse.json({ error: "Request not found" }, { status: 404 });

    const reqRow = row.rows[0];
    if (Number(reqRow.owner_id) !== ownerId) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }
    if (String(reqRow.status) !== "PENDING") {
      return NextResponse.json({ error: "Request is not pending" }, { status: 400 });
    }

    const newStatus = dec === "APPROVE" ? "APPROVED" : "REJECTED";

    await pool.query(
      `
      UPDATE circle_members
      SET status=$1, decided_at=NOW(), decided_by=$2
      WHERE id=$3
      `,
      [newStatus, ownerId, rid]
    );

    // notify requester
    await pool.query(
      `
      INSERT INTO notifications (user_id, type, title, message, meta)
      VALUES ($1, 'JOIN_DECISION', $2, $3,
        jsonb_build_object('circleId',$4,'status',$5)
      )
      `,
      [
        reqRow.requester_id,
        `Join request ${newStatus === "APPROVED" ? "approved ✅" : "rejected ❌"}`,
        `Your request to join "${reqRow.circle_name}" was ${newStatus.toLowerCase()}.`,
        reqRow.circle_id,
        newStatus,
      ]
    );

    return NextResponse.json({ ok: true, status: newStatus });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}