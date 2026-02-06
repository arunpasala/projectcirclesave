import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import pool from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function POST(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const inviteToken = String(body.inviteToken || "").trim();
  if (!inviteToken) return NextResponse.json({ error: "inviteToken required" }, { status: 400 });

  const tokenHash = sha256(inviteToken);

  const invite = await pool.query(
    `
    SELECT id, circle_id, email, status, expires_at
    FROM circle_invites
    WHERE token_hash=$1
    `,
    [tokenHash]
  );

  if (invite.rowCount === 0) return NextResponse.json({ error: "Invalid invite" }, { status: 404 });

  const row = invite.rows[0];

  if (row.status !== "SENT") return NextResponse.json({ error: "Invite not active" }, { status: 409 });
  if (new Date(row.expires_at).getTime() < Date.now())
    return NextResponse.json({ error: "Invite expired" }, { status: 410 });

  // Mark invite accepted
  await pool.query(
    `
    UPDATE circle_invites
    SET status='ACCEPTED', accepted_by=$1, accepted_at=NOW()
    WHERE id=$2
    `,
    [userId, row.id]
  );

  // Add/Upsert member as APPROVED (invites skip approval)
  await pool.query(
    `
    INSERT INTO circle_members (circle_id, user_id, role, status)
    VALUES ($1,$2,'MEMBER','APPROVED')
    ON CONFLICT (circle_id, user_id)
    DO UPDATE SET status='APPROVED'
    `,
    [row.circle_id, userId]
  );

  return NextResponse.json({ message: "Joined circle", circleId: row.circle_id });
}
