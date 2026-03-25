import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const circleId = Number(id);

    if (!Number.isInteger(circleId) || circleId <= 0) {
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

    const body = await req.json();
    const memberUserId = String(body?.memberUserId ?? "");
    const action = String(body?.action ?? "");

    if (!memberUserId || !["APPROVE", "REJECT"].includes(action)) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const { data: circle, error: circleError } = await supabase
      .from("circles")
      .select("id, owner_auth_id, name")
      .eq("id", circleId)
      .maybeSingle();

    if (circleError) {
      return NextResponse.json({ error: circleError.message }, { status: 500 });
    }

    if (!circle) {
      return NextResponse.json({ error: "Circle not found." }, { status: 404 });
    }

    if (circle.owner_auth_id !== user.id) {
      return NextResponse.json(
        { error: "Only owner can manage members." },
        { status: 403 }
      );
    }

    const { data: membership, error: membershipError } = await supabase
      .from("circle_members")
      .select("id, status")
      .eq("circle_id", circleId)
      .eq("user_auth_id", memberUserId)
      .maybeSingle();

    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 500 });
    }

    if (!membership) {
      return NextResponse.json({ error: "Membership not found." }, { status: 404 });
    }

    const newStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";

    const updateData: {
      status: string;
      decided_at: string;
      decided_by_auth_id: string;
      joined_at?: string;
    } = {
      status: newStatus,
      decided_at: new Date().toISOString(),
      decided_by_auth_id: user.id,
    };

    if (newStatus === "APPROVED") {
      updateData.joined_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from("circle_members")
      .update(updateData)
      .eq("id", membership.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await supabase.from("notifications").insert({
      user_auth_id: memberUserId,
      title: action === "APPROVE" ? "Join request approved" : "Join request rejected",
      message:
        action === "APPROVE"
          ? `Your request to join "${circle.name}" was approved.`
          : `Your request to join "${circle.name}" was rejected.`,
      type: action === "APPROVE" ? "JOIN_APPROVED" : "JOIN_REJECTED",
    });

    return NextResponse.json({
      success: true,
      message: action === "APPROVE" ? "Member approved" : "Member rejected",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error." },
      { status: 500 }
    );
  }
}