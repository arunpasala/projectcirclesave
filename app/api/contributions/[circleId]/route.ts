import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ circleId: string }>;
};

export async function GET(_req: NextRequest, context: Context) {
  try {
    const { circleId } = await context.params;
    const parsedCircleId = Number(circleId);

    if (!Number.isInteger(parsedCircleId) || parsedCircleId <= 0) {
      return NextResponse.json({ error: "Invalid circle ID." }, { status: 400 });
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: membership, error: membershipError } = await supabase
      .from("circle_members")
      .select("id")
      .eq("circle_id", parsedCircleId)
      .eq("user_auth_id", user.id)
      .eq("status", "APPROVED")
      .maybeSingle();

    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 500 });
    }

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: rows, error } = await supabase
      .from("contributions")
      .select("id, circle_id, user_auth_id, cycle_no, amount, status, paid_at, created_at")
      .eq("circle_id", parsedCircleId)
      .order("cycle_no", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ contributions: rows ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch contributions." },
      { status: 500 }
    );
  }
}