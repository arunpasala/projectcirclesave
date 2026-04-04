export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { verifyLoginOtp } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const email = String(body.email || "").trim().toLowerCase();
    const otp = String(body.otp || "").trim();

    if (!email || !otp) {
      return NextResponse.json(
        { error: "Email and OTP are required" },
        { status: 400 }
      );
    }

    const result = await verifyLoginOtp(email, otp);

    return NextResponse.json({
      message: "OTP verified successfully",
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    console.error("OTP_VERIFY_ROUTE_ERROR:", error);

    const message =
      error instanceof Error ? error.message : "Failed to verify OTP";

    return NextResponse.json({ error: message }, { status: 401 });
  }
}