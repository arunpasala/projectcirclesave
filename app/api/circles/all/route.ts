import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/circles/all — all circles, with the current user's membership status
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all circles
    const { data: allCircles, error: circlesError } = await supabase
      .from("circles")
      .select("id, owner_id, name, contribution_amount, created_at")
      .order("created_at", { ascending: false });

    if (circlesError) {
      return NextResponse.json({ error: circlesError.message }, { status: 500 });
    }

    // Fetch this user's memberships to annotate my_status
    const { data: memberships } = await supabase
      .from("circle_members")
      .select("circle_id, status")
      .eq("user_id", user.id);

    const membershipMap = new Map<number, string>();
    for (const m of memberships || []) {
      membershipMap.set(m.circle_id, m.status);
    }

    const circles = (allCircles || []).map((c: any) => ({
      ...c,
      my_status: membershipMap.get(c.id) || "NONE",
    }));

    return NextResponse.json({ circles });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}