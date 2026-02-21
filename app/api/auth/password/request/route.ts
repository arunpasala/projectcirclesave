import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import pool from "@/lib/db";

export const runtime = "nodejs";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

async function sendResetEmail(to: string, link: string) {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  // Dev fallback: print link in terminal if SMTP not configured
  if (!host || !user || !pass) {
    console.log(`🔐 PASSWORD_RESET_LINK for ${to}: ${link}`);
    return;
  }

  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || "587"),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth: { user, pass },
  });

  const from = process.env.MAIL_FROM || user;

  await transporter.sendMail({
    from,
    to,
    subject: "CircleSave Password Reset",
    text: `Reset your password using this link: ${link}`,
    html: `<p>Reset your password:</p><p><a href="${link}">${link}</a></p><p>Expires in 15 minutes.</p>`,
  });
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const cleanEmail = String(email || "").trim().toLowerCase();

    if (!cleanEmail) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    // Don't leak if user exists
    const userRes = await pool.query("SELECT id FROM users WHERE email=$1", [cleanEmail]);
    if (userRes.rowCount === 0) {
      return NextResponse.json({ ok: true, message: "If the email exists, a reset link was sent." });
    }

    const userId = userRes.rows[0].id;

    // Invalidate previous tokens (optional)
    await pool.query("UPDATE password_reset_tokens SET used=true WHERE user_id=$1 AND used=false", [userId]);

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = sha256(rawToken);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1,$2,$3)`,
      [userId, tokenHash, expiresAt]
    );

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const link = `${appUrl}/reset-password?token=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(cleanEmail)}`;

    await sendResetEmail(cleanEmail, link);

    return NextResponse.json({ ok: true, message: "If the email exists, a reset link was sent." });
  } catch (e: any) {
    console.error("PASSWORD_REQUEST_ERROR:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}