import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const userId = requireUserId(req.headers.get("authorization"));
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { circleId } = await req.json();
    if (!circleId) {
      return NextResponse.json({ error: "circleId is required" }, { status: 400 });
    }

    // Ensure circle exists
    const circleRes = await pool.query(`SELECT id FROM circles WHERE id=$1`, [circleId]);
    if (circleRes.rowCount === 0) {
      return NextResponse.json({ error: "Circle not found" }, { status: 404 });
    }

    await pool.query(
      `INSERT INTO circle_members (circle_id, user_id, role)
       VALUES ($1, $2, 'member')`,
      [circleId, userId]
    );

    return NextResponse.json({ message: "Joined circle successfully" });
  } catch (err: any) {
    if (err?.code === "23505") {
      return NextResponse.json({ error: "Already a member" }, { status: 409 });
    }
    console.error("JOIN CIRCLE ERROR:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
