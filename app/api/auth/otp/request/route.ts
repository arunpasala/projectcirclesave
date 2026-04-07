import { NextRequest, NextResponse } from "next/server";
import { requestLoginOtp } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    const result = await requestLoginOtp(email, password);

    return NextResponse.json(result);
  } catch (error) {
    console.error("REQUEST_LOGIN_OTP_ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to request OTP",
      },
      { status: 401 }
    );
  }
}