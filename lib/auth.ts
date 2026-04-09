import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";
import supabaseAdmin from "@/lib/supabase/admin";
import { sendOtpEmail } from "@/lib/mailer";

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getAuthClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

export async function requestLoginOtp(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPassword = password.trim();

  if (!normalizedEmail || !normalizedPassword) {
    throw new Error("Email and password are required");
  }

  const authClient = getAuthClient();

  console.log("LOGIN_ATTEMPT:", normalizedEmail);

  const { data: signInData, error: signInError } =
    await authClient.auth.signInWithPassword({
      email: normalizedEmail,
      password: normalizedPassword,
    });

  console.log("SIGNIN_ERROR:", signInError);
  console.log("SIGNIN_USER:", signInData?.user?.id || null);

  if (signInError || !signInData.user) {
    throw new Error(signInError?.message || "Invalid email or password");
  }

  const authUser = signInData.user;

  const { data: existingUser, error: existingUserError } = await supabaseAdmin
    .from("users")
    .select("id, email, auth_user_id")
    .eq("email", normalizedEmail)
    .maybeSingle();

  console.log("PUBLIC_USER_ERROR:", existingUserError);
  console.log("PUBLIC_USER_FOUND:", !!existingUser);

  if (existingUserError) {
    throw new Error(existingUserError.message || "Failed to read user profile");
  }

  if (!existingUser) {
    const { error: insertUserError } = await supabaseAdmin.from("users").insert({
      auth_user_id: authUser.id,
      email: normalizedEmail,
      full_name: authUser.user_metadata?.full_name || "",
      is_verified: true,
      password_hash: "",
      role: "USER",
    });

    console.log("INSERT_PUBLIC_USER_ERROR:", insertUserError);

    if (insertUserError) {
      throw new Error(insertUserError.message || "Failed to sync user profile");
    }
  } else if (!existingUser.auth_user_id) {
    const { error: updateUserError } = await supabaseAdmin
      .from("users")
      .update({
        auth_user_id: authUser.id,
        is_verified: true,
      })
      .eq("id", existingUser.id);

    console.log("UPDATE_PUBLIC_USER_ERROR:", updateUserError);

    if (updateUserError) {
      throw new Error(updateUserError.message || "Failed to link auth user");
    }
  }

  const otp = generateOtp();
  const codeHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { error: invalidateError } = await supabaseAdmin
    .from("otp_codes")
    .update({ used: true })
    .eq("email", normalizedEmail)
    .eq("used", false);

  console.log("OTP_INVALIDATE_ERROR:", invalidateError);

  if (invalidateError) {
    throw new Error(invalidateError.message || "Failed to invalidate old OTPs");
  }

  const { error: insertOtpError } = await supabaseAdmin.from("otp_codes").insert({
    email: normalizedEmail,
    code_hash: codeHash,
    expires_at: expiresAt,
    used: false,
  });

  console.log("OTP_INSERT_ERROR:", insertOtpError);

  if (insertOtpError) {
    throw new Error(insertOtpError.message || "Failed to create OTP");
  }

  const mailResult = await sendOtpEmail(normalizedEmail, otp);
  console.log("MAIL_SENT:", !!mailResult?.messageId);

  return { ok: true };
}

export async function verifyLoginOtp(email: string, otp: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedOtp = otp.trim();

  if (!normalizedEmail || !normalizedOtp) {
    throw new Error("Email and OTP are required");
  }

  console.log("VERIFY_EMAIL:", normalizedEmail);

  const { data: otpRows, error: otpError } = await supabaseAdmin
    .from("otp_codes")
    .select("*")
    .eq("email", normalizedEmail)
    .eq("used", false)
    .order("created_at", { ascending: false })
    .limit(1);

  console.log("OTP_FETCH_ERROR:", otpError);
  console.log("OTP_ROW_FOUND:", !!otpRows?.length);

  if (otpError || !otpRows || otpRows.length === 0) {
    throw new Error("Invalid OTP");
  }

  const otpRow = otpRows[0];

  if (new Date(otpRow.expires_at) < new Date()) {
    throw new Error("OTP expired");
  }

  const otpOk = await bcrypt.compare(normalizedOtp, otpRow.code_hash);
  console.log("OTP_MATCH:", otpOk);

  if (!otpOk) {
    throw new Error("Invalid OTP");
  }

  const { error: markUsedError } = await supabaseAdmin
    .from("otp_codes")
    .update({ used: true })
    .eq("id", otpRow.id);

  console.log("OTP_MARK_USED_ERROR:", markUsedError);

  if (markUsedError) {
    throw new Error(markUsedError.message || "Failed to update OTP status");
  }

  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .select("id, email, full_name, role, auth_user_id")
    .eq("email", normalizedEmail)
    .single();

  console.log("VERIFY_USER_ERROR:", userError);
  console.log("VERIFY_USER_FOUND:", !!user);

  if (userError || !user) {
    throw new Error("User profile not found");
  }

  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is missing");
  }

  const token = jwt.sign(
    {
      userId: user.id,
      authUserId: user.auth_user_id,
      email: user.email,
      role: user.role || "USER",
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  return { token, user };
}

export function getUserIdFromAuthHeader(req: Request): number | null {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.split(" ")[1];

    if (!process.env.JWT_SECRET) {
      return null;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
      userId?: number | string;
    };

    if (!decoded?.userId) {
      return null;
    }

    return Number(decoded.userId);
  } catch {
    return null;
  }
}