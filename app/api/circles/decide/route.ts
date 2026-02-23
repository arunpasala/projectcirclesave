import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const ownerId = requireUserId(req);
    const body = await req.json().catch(() => ({}));

    const membershipId = Number(body?.membershipId);
    const decision = String(body?.decision || "").toUpperCase(); // "APPROVE" | "REJECT"

    if (!Number.isFinite(membershipId) || membershipId <= 0) {
      return NextResponse.json({ error: "Invalid membershipId" }, { status: 400 });
    }
    if (decision !== "APPROVE" && decision !== "REJECT") {
      return NextResponse.json({ error: "decision must be APPROVE or REJECT" }, { status: 400 });
    }

    // Load the request + ensure this owner owns the circle
    const reqRes = await pool.query(
      `
      SELECT cm.id, cm.circle_id, cm.user_id, cm.status, c.owner_id, c.name AS circle_name
      FROM circle_members cm
      JOIN circles c ON c.id = cm.circle_id
      WHERE cm.id = $1
      `,
      [membershipId]
    );

    if (reqRes.rowCount === 0) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const row = reqRes.rows[0];
    if (row.owner_id !== ownerId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    if (row.status !== "PENDING") {
      return NextResponse.json({ error: "Request is not pending" }, { status: 409 });
    }

    const newStatus = decision === "APPROVE" ? "APPROVED" : "REJECTED";

    await pool.query(
      `
      UPDATE circle_members
      SET status = $1,
          decided_at = NOW(),
          decided_by = $2
      WHERE id = $3
      `,
      [newStatus, ownerId, membershipId]
    );

    // Notify requester
    await pool.query(
      `
      INSERT INTO notifications (user_id, title, message)
      VALUES ($1, $2, $3)
      `,
      [
        row.user_id,
        "Join request update",
        `Your request to join "${row.circle_name}" (Circle #${row.circle_id}) was ${newStatus}.`,
      ]
    ).catch(() => {});

    return NextResponse.json({ ok: true, status: newStatus });
  } catch (e: any) {
    console.error("DECIDE_REQUEST_ERROR:", e);
    return NextResponse.json(
      { error: "Failed to decide request", details: String(e?.message || e) },
      { status: 500 }
    );
  }
}