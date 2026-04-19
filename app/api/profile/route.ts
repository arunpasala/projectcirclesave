import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabase/admin";
import { requireAuthUserId } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authUserId = requireAuthUserId(req);

    const { data, error } = await supabaseAdmin
      .from("users")
      .select(
        "id, email, full_name, role, auth_user_id, created_at, is_verified, email_verified, avatar_url, phone, bio"
      )
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({ profile: data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load profile" },
      { status: error?.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authUserId = requireAuthUserId(req);
    const body = await req.json();

    const full_name = String(body?.full_name ?? "").trim();
    const avatar_url = String(body?.avatar_url ?? "").trim();
    const phone = String(body?.phone ?? "").trim();
    const bio = String(body?.bio ?? "").trim();

    if (!full_name) {
      return NextResponse.json(
        { error: "Full name is required" },
        { status: 400 }
      );
    }

    if (full_name.length > 120) {
      return NextResponse.json(
        { error: "Full name is too long" },
        { status: 400 }
      );
    }

    if (phone.length > 30) {
      return NextResponse.json(
        { error: "Phone number is too long" },
        { status: 400 }
      );
    }

    if (bio.length > 500) {
      return NextResponse.json(
        { error: "Bio is too long" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("users")
      .update({
        full_name,
        avatar_url: avatar_url || null,
        phone: phone || null,
        bio: bio || null,
      })
      .eq("auth_user_id", authUserId)
      .select(
        "id, email, full_name, role, auth_user_id, created_at, is_verified, email_verified, avatar_url, phone, bio"
      )
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        message: "Profile updated successfully",
        profile: data,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to update profile" },
      { status: error?.message === "Unauthorized" ? 401 : 500 }
    );
  }
}