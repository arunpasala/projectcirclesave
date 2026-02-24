import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireUserId } from "@/lib/auth";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> | { id: string } };

export async function GET(req: NextRequest, context: Ctx) {
  try {
    const userId = requireUserId(req);

    const { id } = await Promise.resolve(context.params);
    const circleId = Number(id);

    if (!Number.isFinite(circleId) || circleId <= 0) {
      return NextResponse.json({ error: "Invalid circle id" }, { status: 400 });
    }

    // ✅ Fetch circle (only columns that definitely exist)
    const c = await pool.query(
      "SELECT id, owner_id, name FROM circles WHERE id=$1",
      [circleId]
    );

    if (c.rowCount === 0) {
      return NextResponse.json({ error: "Circle not found" }, { status: 404 });
    }

    const circle = c.rows[0];

    // Access: owner OR member record exists
    const access = await pool.query(
      `SELECT status, role
       FROM circle_members
       WHERE circle_id=$1 AND user_id=$2
       LIMIT 1`,
      [circleId, userId]
    );

    const isOwner = Number(circle.owner_id) === userId;
    const membership = access.rowCount ? access.rows[0] : null;

    if (!isOwner && !membership) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }

    // Members (case-safe)
    const membersRes = await pool.query(
      `
      SELECT
        u.id as user_id,
        u.email,
        cm.role,
        cm.status,
        UPPER(cm.status) as status_norm
      FROM circle_members cm
      JOIN users u ON u.id = cm.user_id
      WHERE cm.circle_id=$1
      ORDER BY u.id ASC
      `,
      [circleId]
    );

    const members = membersRes.rows.map((r: any) => ({
      user_id: r.user_id,
      email: r.email,
      role: String(r.role || ""),
      status: String(r.status || ""),
      status_norm: String(r.status_norm || ""),
    }));

    const approvedMembers = members.filter((m) => m.status_norm === "APPROVED");
    const pendingMembers = members.filter((m) => m.status_norm === "PENDING");

    return NextResponse.json({
      circle,
      members,
      approvedMembers,
      pendingMembers,
      approvedCount: approvedMembers.length,
      pendingCount: pendingMembers.length,
      viewer: {
        isOwner,
        status: membership?.status ?? (isOwner ? "OWNER" : "NONE"),
        role: membership?.role ?? (isOwner ? "OWNER" : "NONE"),
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}