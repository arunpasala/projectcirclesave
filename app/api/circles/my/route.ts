import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: memberships, error: membershipError } = await supabase
      .from("circle_members")
      .select("circle_id, role, status, joined_at")
      .eq("user_auth_id", user.id)
      .eq("status", "APPROVED");

    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 500 });
    }

    const circleIds = (memberships ?? []).map((m) => m.circle_id);

    if (circleIds.length === 0) {
      return NextResponse.json({ circles: [] });
    }

    const { data: circles, error: circlesError } = await supabase
      .from("circles")
      .select("id, name, contribution_amount, created_at, owner_auth_id")
      .in("id", circleIds)
      .order("created_at", { ascending: false });

    if (circlesError) {
      return NextResponse.json({ error: circlesError.message }, { status: 500 });
    }

    const merged = (circles ?? []).map((circle) => {
      const membership = memberships?.find((m) => m.circle_id === circle.id);
      return {
        ...circle,
        membership_role: membership?.role ?? null,
        membership_status: membership?.status ?? null,
        joined_at: membership?.joined_at ?? null,
      };
    });

    return NextResponse.json({ circles: merged });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch my circles." },
      { status: 500 }
    );
  }
}