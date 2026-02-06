import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import crypto from "crypto";
import { requireUserId } from "@/lib/auth";

export const runtime = "nodejs";

function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const userId = requireUserId(req);
    const { token } = await req.json();
    if (!token) return NextResponse.json({ message: "token required" }, { status: 400 });

    const tokenHash = sha256(token);

    const invite = await pool.query(
      `SELECT id, circle_id, email, status, expires_at
       FROM circle_invites
       WHERE token_hash=$1`,
      [tokenHash]
    );
    if (!invite.rowCount) return NextResponse.json({ message: "Invalid invite" }, { status: 400 });

    const inv = invite.rows[0];
    if (inv.status !== "SENT") return NextResponse.json({ message: "Invite already used" }, { status: 409 });
    if (new Date(inv.expires_at).getTime() < Date.now()) return NextResponse.json({ message: "Invite expired" }, { status: 410 });

    const me = await pool.query(`SELECT email FROM users WHERE id=$1`, [userId]);
    const myEmail = (me.rows[0]?.email || "").toLowerCase();
    if (myEmail !== (inv.email || "").toLowerCase()) {
      return NextResponse.json({ message: "Invite email mismatch" }, { status: 403 });
    }

    // upsert membership approved
    await pool.query(
      `INSERT INTO circle_members(circle_id, user_id, role, status)
       VALUES($1,$2,'MEMBER','APPROVED')
       ON CONFLICT(circle_id, user_id)
       DO UPDATE SET status='APPROVED'`,
      [inv.circle_id, userId]
    );

    await pool.query(
      `UPDATE circle_invites
       SET status='ACCEPTED', accepted_by=$2, accepted_at=NOW()
       WHERE id=$1`,
      [inv.id, userId]
    );

    return NextResponse.json({ message: "Invite accepted", circleId: inv.circle_id });
  } catch (e: any) {
    if (e?.message === "UNAUTHORIZED") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
