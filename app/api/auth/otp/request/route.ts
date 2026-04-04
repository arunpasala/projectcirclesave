export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requestLoginOtp } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await requestLoginOtp(body.email, body.password);
    return NextResponse.json(result);
  } catch (error) {
    console.error("REQUEST_LOGIN_OTP_ERROR:", error);

    const message =
      error instanceof Error ? error.message : "Failed to process login";

    return NextResponse.json({ error: message }, { status: 401 });
  }
}