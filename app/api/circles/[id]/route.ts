import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const circleId = Number(id);

    if (!circleId) {
      return NextResponse.json({ error: "Invalid circle id" }, { status: 400 });
    }

    // Get circle
    const { data: circle, error: circleError } = await supabase
      .from("circles")
      .select("*")
      .eq("id", circleId)
      .single();

    if (circleError || !circle) {
      return NextResponse.json({ error: "Circle not found" }, { status: 404 });
    }

    // Members
    const { data: members } = await supabase
      .from("circle_members")
      .select("*")
      .eq("circle_id", circleId);

    // Contributions
    const { data: contributions } = await supabase
      .from("contributions")
      .select("*")
      .eq("circle_id", circleId);

    // Payouts
    const { data: payouts } = await supabase
      .from("payout_schedule")
      .select("*")
      .eq("circle_id", circleId)
      .order("cycle_no", { ascending: true });

    return NextResponse.json({
      circle,
      members: members || [],
      contributions: contributions || [],
      payouts: payouts || [],
    });
  } catch (error) {
    console.error("GET /api/circles/[id] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}