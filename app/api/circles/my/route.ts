import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const userId = requireUserId(req.headers.get("authorization"));
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const res = await pool.query(
      `SELECT c.id, c.name, c.contribution_amount, c.owner_id, c.created_at,
              cm.role, cm.joined_at
       FROM circle_members cm
       JOIN circles c ON c.id = cm.circle_id
       WHERE cm.user_id = $1
       ORDER BY c.created_at DESC`,
      [userId]
    );

    return NextResponse.json({ circles: res.rows });
  } catch (err) {
    console.error("MY CIRCLES ERROR:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
