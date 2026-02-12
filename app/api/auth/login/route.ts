import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import pool from "@/lib/db";

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
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const userRes = await pool.query(
      "SELECT id, email, password_hash, is_verified, full_name FROM users WHERE email=$1",
      [cleanEmail]
    );
    if (userRes.rowCount === 0) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const user = userRes.rows[0];
    const ok = await bcrypt.compare(cleanPassword, user.password_hash);
    if (!ok) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });

    // Not verified -> issue OTP (don’t return token)
    if (!user.is_verified) {
      const otp = makeOtp();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await pool.query("DELETE FROM otp_codes WHERE user_id=$1", [user.id]);
      await pool.query(
        `INSERT INTO otp_codes (user_id, code_hash, expires_at)
         VALUES ($1,$2,$3)`,
        [user.id, hashOtp(otp), expiresAt]
      );

      console.log(`✅ OTP for ${cleanEmail}: ${otp} (expires ${expiresAt.toISOString()})`);

      return NextResponse.json(
        { error: "Verify OTP first", code: "VERIFY_OTP_REQUIRED", email: cleanEmail },
        { status: 403 }
      );
    }

    // Verified -> JWT
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || "dev_secret",
      { expiresIn: "1h" }
    );

    return NextResponse.json({
      token,
      user: { id: user.id, email: user.email, fullName: user.full_name },
    });
  } catch (e: any) {
    console.error("LOGIN_ERROR:", e);
    return NextResponse.json(
      { error: "Server error", details: String(e?.message || e) },
      { status: 500 }
    );
  }
}
