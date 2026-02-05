import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json(
        { error: "Email and OTP are required" },
        { status: 400 }
      );
    }

    // Find user
    const userRes = await pool.query(`SELECT id FROM users WHERE email=$1`, [email]);
    if (userRes.rowCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const userId = userRes.rows[0].id;

    // Get latest unused OTP for this user
    const otpRes = await pool.query(
      `SELECT id, otp_hash, expires_at, attempts, used
       FROM otp_codes
       WHERE user_id=$1 AND used=false
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );

    if (otpRes.rowCount === 0) {
      return NextResponse.json({ error: "No OTP found" }, { status: 404 });
    }

    const row = otpRes.rows[0];

    if (new Date(row.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "OTP expired" }, { status: 400 });
    }

    if (row.attempts >= 5) {
      return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
    }

    // increment attempts (always)
    await pool.query(`UPDATE otp_codes SET attempts = attempts + 1 WHERE id=$1`, [row.id]);

    const ok = await bcrypt.compare(String(otp), row.otp_hash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 401 });
    }

    // success: mark OTP used and user verified
    await pool.query(`UPDATE otp_codes SET used=true WHERE id=$1`, [row.id]);
    await pool.query(`UPDATE users SET is_verified=true WHERE id=$1`, [userId]);

    return NextResponse.json({ message: "OTP verified" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
