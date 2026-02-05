import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const userId = requireUserId(req.headers.get("authorization"));
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, contributionAmount } = await req.json();
    if (!name) return NextResponse.json({ error: "Circle name is required" }, { status: 400 });

    const circleRes = await pool.query(
      `INSERT INTO circles (owner_id, name, contribution_amount)
       VALUES ($1, $2, $3)
       RETURNING id, owner_id, name, contribution_amount, created_at`,
      [userId, name, contributionAmount ?? 0]
    );

    const circle = circleRes.rows[0];

    // Owner also becomes a member
    await pool.query(
      `INSERT INTO circle_members (circle_id, user_id, role)
       VALUES ($1, $2, 'owner')`,
      [circle.id, userId]
    );

    return NextResponse.json({ circle }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
