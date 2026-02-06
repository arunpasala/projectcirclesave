import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const adminId = requireUserId(req);
    const { membershipId } = await req.json();

    const check = await pool.query(
      `SELECT cm.id, cm.circle_id
       FROM circle_members cm
       JOIN circles c ON c.id = cm.circle_id
       WHERE cm.id=$1 AND c.owner_id=$2`,
      [membershipId, adminId]
    );
    if (!check.rowCount) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    await pool.query(
      `UPDATE circle_members
       SET status='APPROVED', decided_at=NOW(), decided_by=$2
       WHERE id=$1`,
      [membershipId, adminId]
    );

    return NextResponse.json({ message: "Approved" });
  } catch (e: any) {
    if (e?.message === "UNAUTHORIZED") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
