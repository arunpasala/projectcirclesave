import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const userId = requireUserId(req);
    const body = await req.json().catch(() => ({}));
    const circleId = Number(body?.circleId);

    if (!Number.isFinite(circleId) || circleId <= 0) {
      return NextResponse.json({ error: "Invalid circleId" }, { status: 400 });
    }

    // circle exists + owner
    const circleRes = await pool.query(
      `SELECT id, owner_id, name FROM circles WHERE id=$1`,
      [circleId]
    );
    if (circleRes.rowCount === 0) {
      return NextResponse.json({ error: "Circle not found" }, { status: 404 });
    }
    const circle = circleRes.rows[0];

    if (circle.owner_id === userId) {
      return NextResponse.json({ error: "Owner cannot request to join own circle." }, { status: 400 });
    }

    // existing membership/request?
    const existsRes = await pool.query(
      `SELECT status FROM circle_members WHERE circle_id=$1 AND user_id=$2 LIMIT 1`,
      [circleId, userId]
    );

    if (existsRes.rowCount > 0) {
      const st = String(existsRes.rows[0].status || "");
      if (st === "APPROVED") {
        return NextResponse.json({ error: "You are already a member." }, { status: 409 });
      }
      if (st === "PENDING") {
        return NextResponse.json({ error: "Request already pending." }, { status: 409 });
      }
      if (st === "REJECTED") {
        // allow re-request: overwrite to PENDING
        await pool.query(
          `
          UPDATE circle_members
          SET status='PENDING', requested_at=NOW(), decided_at=NULL, decided_by=NULL
          WHERE circle_id=$1 AND user_id=$2
          `,
          [circleId, userId]
        );
      }
    } else {
      // insert request
      await pool.query(
        `
        INSERT INTO circle_members (circle_id, user_id, role, status, requested_at)
        VALUES ($1, $2, 'MEMBER', 'PENDING', NOW())
        `,
        [circleId, userId]
      );
    }

    // notify owner (requires notifications table)
    await pool.query(
      `
      INSERT INTO notifications (user_id, title, message)
      VALUES ($1, $2, $3)
      `,
      [
        circle.owner_id,
        "New join request",
        `User #${userId} requested to join "${circle.name}" (Circle #${circleId}).`,
      ]
    ).catch(() => { /* ignore if table not created yet */ });

    return NextResponse.json({ ok: true, message: "Join request submitted ✅" });
  } catch (e: any) {
    console.error("REQUEST_JOIN_ERROR:", e);
    return NextResponse.json(
      { error: "Failed to request join", details: String(e?.message || e) },
      { status: 500 }
    );
  }
}