import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminId = requireUserId(req);
    const circleId = Number(params.id);
    const { userId } = await req.json();

    const adminCheck = await pool.query(
      `SELECT 1 FROM circle_members
       WHERE circle_id=$1 AND user_id=$2 AND role='ADMIN' AND status='APPROVED'`,
      [circleId, adminId]
    );
    if (adminCheck.rowCount === 0) {
      return NextResponse.json({ message: "Admin only" }, { status: 403 });
    }

    // prevent removing self admin (optional)
    if (Number(userId) === adminId) {
      return NextResponse.json({ message: "Admin cannot remove self" }, { status: 400 });
    }

    await pool.query(
      `DELETE FROM circle_members WHERE circle_id=$1 AND user_id=$2`,
      [circleId, Number(userId)]
    );

    return NextResponse.json({ message: "Removed" });
  } catch (e: any) {
    return NextResponse.json({ message: e.message || "Server error" }, { status: 500 });
  }
}
