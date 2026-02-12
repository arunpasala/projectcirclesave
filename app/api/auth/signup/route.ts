// app/api/auth/signup/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const fullName = String(body.fullName || "").trim();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rowCount && existing.rowCount > 0) {
      return NextResponse.json({ error: "Account already exists. Please login." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (email, full_name, password_hash, is_verified)
       VALUES ($1, $2, $3, FALSE)
       RETURNING id, email, full_name, is_verified, created_at`,
      [email, fullName || null, passwordHash]
    );

    // ✅ no OTP here
    return NextResponse.json(
      { user: result.rows[0], message: "Account created. Please login to receive OTP." },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("SIGNUP_ERROR:", err?.message || err);
    return NextResponse.json({ error: "Signup failed. Please try again." }, { status: 500 });
  }
}
