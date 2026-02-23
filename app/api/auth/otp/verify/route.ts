import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";
import { sendMail } from "@/lib/mailer";

export const runtime = "nodejs";

function hashOtp(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function maskEmail(email: string) {
  const [u, d] = email.split("@");
  if (!u || !d) return email;
  const head = u.slice(0, 2);
  const tail = u.slice(-1);
  return `${head}***${tail}@${d}`;
}

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();

    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanCode = String(code || "").trim();

    if (!cleanEmail || !cleanCode) {
      return NextResponse.json({ error: "Email and OTP are required." }, { status: 400 });
    }

    // 1) find user
    const userRes = await pool.query(
      "SELECT id, email, full_name FROM users WHERE email=$1",
      [cleanEmail]
    );
    if (userRes.rowCount === 0) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    const user = userRes.rows[0];

    // 2) get latest OTP
    const otpRes = await pool.query(
      `SELECT id, code_hash, expires_at
       FROM otp_codes
       WHERE user_id=$1
       ORDER BY id DESC
       LIMIT 1`,
      [user.id]
    );
    if (otpRes.rowCount === 0) {
      return NextResponse.json({ error: "OTP not found. Please login again." }, { status: 400 });
    }

    const otpRow = otpRes.rows[0];
    const now = new Date();
    const expires = new Date(otpRow.expires_at);

    if (now > expires) {
      return NextResponse.json({ error: "OTP expired. Please login again." }, { status: 400 });
    }

    if (hashOtp(cleanCode) !== otpRow.code_hash) {
      return NextResponse.json({ error: "Invalid OTP." }, { status: 400 });
    }

    // 3) consume OTP
    await pool.query("DELETE FROM otp_codes WHERE user_id=$1", [user.id]);

    // 4) issue JWT
    const secret = process.env.JWT_SECRET || "dev_secret";
    const token = jwt.sign({ userId: user.id }, secret, { expiresIn: "1h" });

    // 5) LOGIN CONFIRMATION EMAIL ✅
    const ip =
      (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const ua = req.headers.get("user-agent") || "unknown";
    const whenLocal = new Date().toLocaleString("en-US", {
      timeZone: "America/New_York",
    });

    const displayName = user.full_name ? String(user.full_name) : maskEmail(cleanEmail);

    await sendMail({
      to: cleanEmail,
      subject: "CircleSave: Login successful ✅",
      text:
        `Hi ${displayName},\n\n` +
        `A login to your CircleSave account was just completed successfully.\n\n` +
        `Time: ${whenLocal} (America/New_York)\n` +
        `IP: ${ip}\n` +
        `Device: ${ua}\n\n` +
        `If this wasn’t you, please reset your password immediately.\n\n` +
        `— CircleSave Security`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
          <h2 style="margin:0 0 8px">Login successful ✅</h2>
          <p style="margin:0 0 12px">Hi <b>${displayName}</b>,</p>
          <p style="margin:0 0 14px">
            A login to your <b>CircleSave</b> account was just completed successfully.
          </p>

          <div style="border:1px solid #e2e8f0;border-radius:12px;padding:12px;background:#f8fafc">
            <div><b>Time:</b> ${whenLocal} (America/New_York)</div>
            <div><b>IP:</b> ${ip}</div>
            <div style="margin-top:6px"><b>Device:</b> ${ua}</div>
          </div>

          <p style="margin:14px 0 0;color:#b91c1c">
            <b>If this wasn’t you, reset your password immediately.</b>
          </p>
          <p style="margin:12px 0 0;color:#64748b;font-size:12px">
            — CircleSave Security
          </p>
        </div>
      `,
    });

    return NextResponse.json({
      ok: true,
      token,
      user: { id: user.id, email: user.email, fullName: user.full_name },
    });
  } catch (e: any) {
    console.error("OTP_VERIFY_ERROR:", e);
    return NextResponse.json(
      { error: "Server error", details: String(e?.message || e) },
      { status: 500 }
    );
  }
}