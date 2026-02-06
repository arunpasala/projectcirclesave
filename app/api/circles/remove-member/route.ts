import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const adminId = requireUserId(req);
    const { circleId, userId } = await req.json();

    const owner = await pool.query(`SELECT owner_id FROM circles WHERE id=$1`, [circleId]);
    if (!owner.rowCount || owner.rows[0].owner_id !== adminId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await pool.query(`DELETE FROM circle_members WHERE circle_id=$1 AND user_id=$2`, [circleId, userId]);
    return NextResponse.json({ message: "Removed" });
  } catch (e: any) {
    if (e?.message === "UNAUTHORIZED") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
