import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const userId = requireUserId(req);
    const body = await req.json();
    const circleId = Number(body.circleId);

    if (!circleId) return NextResponse.json({ message: "circleId required" }, { status: 400 });

    // if already exists -> conflict
    const existing = await pool.query(
      `SELECT status FROM circle_members WHERE circle_id=$1 AND user_id=$2`,
      [circleId, userId]
    );
    if (existing.rowCount) {
      return NextResponse.json({ message: `Already ${existing.rows[0].status}` }, { status: 409 });
    }

    await pool.query(
      `INSERT INTO circle_members(circle_id, user_id, role, status)
       VALUES ($1, $2, 'MEMBER', 'PENDING')`,
      [circleId, userId]
    );

    return NextResponse.json({ message: "Request sent" });
  } catch (e: any) {
    if (e?.message === "UNAUTHORIZED") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
