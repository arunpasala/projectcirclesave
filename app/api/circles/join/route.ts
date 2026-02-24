import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const userId = requireUserId(req);
    const { circleId } = await req.json();

    const id = Number(circleId);
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: "Invalid circleId" }, { status: 400 });
    }

    // circle exists?
    const c = await pool.query("SELECT id, owner_id, name FROM circles WHERE id=$1", [id]);
    if (c.rowCount === 0) {
      return NextResponse.json({ error: "Circle not found" }, { status: 404 });
    }

    const circle = c.rows[0];

    // Upsert membership as PENDING
    // If already exists, do not overwrite APPROVED
    const existing = await pool.query(
      "SELECT status FROM circle_members WHERE circle_id=$1 AND user_id=$2",
      [id, userId]
    );

    if (existing.rowCount > 0) {
      const st = String(existing.rows[0].status || "");
      if (st === "APPROVED") {
        return NextResponse.json(
          { message: "You are already a member.", status: "APPROVED" },
          { status: 200 }
        );
      }
      if (st === "PENDING") {
        return NextResponse.json(
          { message: "Already requested.", status: "PENDING" },
          { status: 200 }
        );
      }

      // if REJECTED -> allow requesting again
      await pool.query(
        `
        UPDATE circle_members
        SET status='PENDING', requested_at=NOW(), decided_at=NULL, decided_by=NULL
        WHERE circle_id=$1 AND user_id=$2
        `,
        [id, userId]
      );
    } else {
      await pool.query(
        `
        INSERT INTO circle_members (circle_id, user_id, role, status)
        VALUES ($1, $2, 'MEMBER', 'PENDING')
        `,
        [id, userId]
      );
    }

    // Notify circle owner/admin (simple schema)
    if (Number(circle.owner_id) !== userId) {
      await pool.query(
        `
        INSERT INTO notifications (user_id, title, message)
        VALUES ($1, $2, $3)
        `,
        [
          Number(circle.owner_id),
          "New join request",
          `User ${userId} requested to join your circle "${circle.name}".`,
        ]
      );
    }

    return NextResponse.json({ message: "Join request submitted ✅", status: "PENDING" });
  } catch (e: any) {
    console.error("JOIN CIRCLE ERROR:", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}