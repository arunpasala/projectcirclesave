import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    // require auth (since you want dashboard protected)
    requireUserId(req);

    const r = await pool.query(
      `SELECT id, owner_id, name, contribution_amount, created_at
       FROM circles
       ORDER BY created_at DESC`
    );

    return NextResponse.json({ circles: r.rows });
  } catch (e: any) {
    return NextResponse.json({ message: e.message || "Unauthorized" }, { status: 401 });
  }
}
