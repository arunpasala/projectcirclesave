import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const userId = requireUserId(req); // ✅ pass req, not req.headers

    const body = await req.json();
    const name = String(body?.name || "").trim();
    const contributionAmount = Number(body?.contributionAmount);

    if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
    if (!Number.isFinite(contributionAmount) || contributionAmount <= 0) {
      return NextResponse.json({ error: "Invalid contributionAmount" }, { status: 400 });
    }

    const insert = await pool.query(
      `INSERT INTO circles (owner_id, name, contribution_amount)
       VALUES ($1,$2,$3)
       RETURNING id, owner_id, name, contribution_amount, created_at`,
      [userId, name, contributionAmount]
    );

    return NextResponse.json({ ok: true, circle: insert.rows[0] }, { status: 201 });
  } catch (e: any) {
    console.error("CIRCLE_CREATE_ERROR:", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}