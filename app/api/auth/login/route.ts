import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
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
    const { email, password } = await req.json();

    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanPassword = String(password || "");

    if (!cleanEmail || !cleanPassword) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const userRes = await pool.query(
      "SELECT id, email, password_hash, full_name FROM users WHERE email=$1",
      [cleanEmail]
    );

    if (userRes.rowCount === 0) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const user = userRes.rows[0];
    const ok = await bcrypt.compare(cleanPassword, user.password_hash);
    if (!ok) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });

    // ✅ ALWAYS issue OTP on every login attempt
    const otp = makeOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query("DELETE FROM otp_codes WHERE user_id=$1", [user.id]);
    await pool.query(
      `INSERT INTO otp_codes (user_id, code_hash, expires_at)
       VALUES ($1,$2,$3)`,
      [user.id, hashOtp(otp), expiresAt]
    );

    // ✅ Send OTP email
    await sendMail({
      to: cleanEmail,
      subject: "Your CircleSave login OTP",
      text:
        `Your CircleSave OTP is: ${otp}\n\n` +
        `It expires in 10 minutes.\n\n` +
        `If you did not request this, you can ignore this email.`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6">
          <h2>CircleSave OTP</h2>
          <p>Your OTP is:</p>
          <div style="font-size:28px;font-weight:700;letter-spacing:2px">${otp}</div>
          <p><b>Expires in 10 minutes</b>.</p>
          <p style="color:#666">If you did not request this, ignore this email.</p>
        </div>
      `,
    });

    // For dev visibility
    console.log(`✅ OTP emailed to ${cleanEmail} (expires ${expiresAt.toISOString()})`);

    // ✅ No token here
    return NextResponse.json(
      { code: "VERIFY_OTP_REQUIRED", message: "OTP sent", email: cleanEmail },
      { status: 403 }
    );
  } catch (e: any) {
    console.error("LOGIN_ERROR:", e);
    return NextResponse.json(
      { error: "Server error", details: String(e?.message || e) },
      { status: 500 }
    );
  }
}