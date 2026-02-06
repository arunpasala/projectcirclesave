import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const userId = requireUserId(req);

    const r = await pool.query(
      "SELECT id, email, full_name FROM users WHERE id=$1",
      [userId]
    );

    if (r.rowCount === 0) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user: r.rows[0] });
  } catch (e: any) {
    return NextResponse.json({ message: e.message || "Unauthorized" }, { status: 401 });
  }
}
