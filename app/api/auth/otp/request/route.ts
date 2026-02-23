import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import pool from "@/lib/db";
import { sendMail } from "@/lib/mailer";

export const runtime = "nodejs";

function makeOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}
function hashOtp(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const cleanEmail = String(email || "").trim().toLowerCase();

    if (!cleanEmail) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const userRes = await pool.query("SELECT id FROM users WHERE email=$1", [cleanEmail]);
    if (userRes.rowCount === 0) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const user = userRes.rows[0];

    // ✅ rate-limit: allow resend only every 30 seconds
    const lastOtp = await pool.query(
      `SELECT created_at FROM otp_codes
       WHERE user_id=$1
       ORDER BY id DESC
       LIMIT 1`,
      [user.id]
    );

    if (lastOtp.rowCount > 0) {
      const createdAt = new Date(lastOtp.rows[0].created_at);
      const diff = Date.now() - createdAt.getTime();
      if (diff < 30_000) {
        const wait = Math.ceil((30_000 - diff) / 1000);
        return NextResponse.json(
          { error: `Please wait ${wait}s before resending.` },
          { status: 429 }
        );
      }
    }

    // create new otp
    const otp = makeOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query("DELETE FROM otp_codes WHERE user_id=$1", [user.id]);
    await pool.query(
      `INSERT INTO otp_codes (user_id, code_hash, expires_at)
       VALUES ($1,$2,$3)`,
      [user.id, hashOtp(otp), expiresAt]
    );

    await sendMail({
      to: cleanEmail,
      subject: "Your CircleSave login OTP (Resent)",
      text:
        `Your CircleSave OTP is: ${otp}\n\n` +
        `It expires in 10 minutes.\n\n` +
        `If you did not request this, ignore this email.`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6">
          <h2>CircleSave OTP (Resent)</h2>
          <p>Your OTP is:</p>
          <div style="font-size:28px;font-weight:700;letter-spacing:2px">${otp}</div>
          <p><b>Expires in 10 minutes</b>.</p>
          <p style="color:#666">If you did not request this, ignore this email.</p>
        </div>
      `,
    });

    console.log(`✅ OTP resent to ${cleanEmail} (expires ${expiresAt.toISOString()})`);

    return NextResponse.json({ ok: true, message: "OTP resent." });
  } catch (e: any) {
    console.error("OTP_REQUEST_ERROR:", e);
    return NextResponse.json(
      { error: "Server error", details: String(e?.message || e) },
      { status: 500 }
    );
  }
}