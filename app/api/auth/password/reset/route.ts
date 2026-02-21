import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";

export const runtime = "nodejs";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const { email, token, newPassword } = await req.json();

    const cleanEmail = String(email || "").trim().toLowerCase();
    const rawToken = String(token || "").trim();
    const pwd = String(newPassword || "");

    if (!cleanEmail || !rawToken || !pwd) {
      return NextResponse.json({ error: "Email, token, and newPassword are required." }, { status: 400 });
    }
    if (pwd.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const userRes = await pool.query("SELECT id FROM users WHERE email=$1", [cleanEmail]);
    if (userRes.rowCount === 0) {
      return NextResponse.json({ error: "Invalid reset link." }, { status: 400 });
    }

    const userId = userRes.rows[0].id;
    const tokenHash = sha256(rawToken);

    const tokRes = await pool.query(
      `SELECT id, expires_at, used
       FROM password_reset_tokens
       WHERE user_id=$1 AND token_hash=$2
       ORDER BY id DESC
       LIMIT 1`,
      [userId, tokenHash]
    );

    if (tokRes.rowCount === 0) return NextResponse.json({ error: "Invalid reset link." }, { status: 400 });

    const row = tokRes.rows[0];

    if (row.used) return NextResponse.json({ error: "Reset link already used." }, { status: 400 });
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "Reset link expired." }, { status: 400 });
    }

    const newHash = await bcrypt.hash(pwd, 12);

    // ✅ matches your users table column
    await pool.query("UPDATE users SET password_hash=$1 WHERE id=$2", [newHash, userId]);
    await pool.query("UPDATE password_reset_tokens SET used=true WHERE id=$1", [row.id]);

    return NextResponse.json({ ok: true, message: "Password updated successfully." }, { status: 200 });
  } catch (e: any) {
    console.error("PASSWORD_RESET_ERROR:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}