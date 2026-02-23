import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const userId = requireUserId(req);

    const r = await pool.query(
      `
      SELECT id, type, title, message, meta, is_read, created_at
      FROM notifications
      WHERE user_id=$1
      ORDER BY created_at DESC
      LIMIT 50
      `,
      [userId]
    );

    return NextResponse.json({ notifications: r.rows });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = requireUserId(req);
    const { notificationId } = await req.json();
    const id = Number(notificationId);

    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: "Invalid notificationId" }, { status: 400 });
    }

    await pool.query(
      "UPDATE notifications SET is_read=true WHERE id=$1 AND user_id=$2",
      [id, userId]
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}