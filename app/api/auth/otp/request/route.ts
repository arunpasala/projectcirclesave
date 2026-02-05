import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

function generateOtp(length = 6) {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const userRes = await pool.query(`SELECT id FROM users WHERE email=$1`, [email]);
    if (userRes.rowCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const userId = userRes.rows[0].id;

    const otp = generateOtp(6);
    const otpHash = await bcrypt.hash(otp, 10);

    const ttl = Number(process.env.OTP_TTL_SECONDS || 300);
    const expiresAt = new Date(Date.now() + ttl * 1000);

    await pool.query(
      `INSERT INTO otp_codes (user_id, otp_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, otpHash, expiresAt]
    );

    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST!,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
    });

    await transport.sendMail({
      from: process.env.SMTP_FROM!,
      to: email,
      subject: "Your CircleSave OTP Code",
      text: `Your OTP is: ${otp}. It expires in ${Math.floor(ttl / 60)} minutes.`,
    });

    return NextResponse.json({ message: "OTP sent" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
