import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import pool from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function POST(req: NextRequest) {
  const adminId = getUserIdFromRequest(req);
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const circleId = Number(body.circleId);
  const email = String(body.email || "").trim().toLowerCase();

  if (!circleId || !email) return NextResponse.json({ error: "circleId & email required" }, { status: 400 });

  // Must be circle owner
  const ownerCheck = await pool.query("SELECT 1 FROM circles WHERE id=$1 AND owner_id=$2", [circleId, adminId]);
  if (ownerCheck.rowCount === 0) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rawToken = crypto.randomBytes(24).toString("hex");
  const tokenHash = sha256(rawToken);

  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h

  await pool.query(
    `
    INSERT INTO circle_invites (circle_id, email, token_hash, expires_at, created_by)
    VALUES ($1,$2,$3,$4,$5)
    `,
    [circleId, email, tokenHash, expiresAt, adminId]
  );

  // MVP: return link (later: send email)
  const inviteLink = `${process.env.NEXT_PUBLIC_BASE_URL}/signup?invite=${rawToken}`;

  return NextResponse.json({ message: "Invite created", inviteLink });
}
