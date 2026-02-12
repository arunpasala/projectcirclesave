import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import pool from "@/lib/db";

export const runtime = "nodejs";

function hashOtp(code: string) {
    return crypto.createHash("sha256").update(code).digest("hex");
}

export async function POST(req: NextRequest) {
    try {
        const { email, code } = await req.json();
        const cleanEmail = String(email || "").trim().toLowerCase();
        const cleanCode = String(code || "").trim();

        if (!cleanEmail || !cleanCode) {
            return NextResponse.json({ error: "Email and OTP are required." }, { status: 400 });
        }

        const userRes = await pool.query("SELECT id, is_verified FROM users WHERE email=$1", [cleanEmail]);
        if (userRes.rowCount === 0) return NextResponse.json({ error: "User not found." }, { status: 404 });

        const user = userRes.rows[0];
        if (user.is_verified) return NextResponse.json({ ok: true, message: "Already verified." });

        const otpRes = await pool.query(
            `SELECT id, code_hash, expires_at FROM otp_codes
       WHERE user_id=$1
       ORDER BY id DESC
       LIMIT 1`,
            [user.id]
        );

        if (otpRes.rowCount === 0) {
            return NextResponse.json({ error: "OTP not found. Please login again to request OTP." }, { status: 400 });
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

        await pool.query("UPDATE users SET is_verified=TRUE WHERE id=$1", [user.id]);
        await pool.query("DELETE FROM otp_codes WHERE user_id=$1", [user.id]);

        return NextResponse.json({ ok: true, message: "Email verified successfully." });
    } catch (e: any) {
        console.error("OTP_VERIFY_ERROR:", e);
        return NextResponse.json(
            { error: "Server error", details: String(e?.message || e) },
            { status: 500 }
        );
    }
}
