import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabase/admin";
import { requireAuthUserId } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const authUserId = requireAuthUserId(req);

    const body = await req.json();
    const circleId = Number(body?.circle_id);
    const userAuthId = body?.user_auth_id;

    if (!Number.isInteger(circleId) || circleId <= 0) {
      return NextResponse.json({ error: "Invalid circle_id" }, { status: 400 });
    }

    if (!userAuthId || typeof userAuthId !== "string") {
      return NextResponse.json({ error: "Invalid user_auth_id" }, { status: 400 });
    }

    const { data: circle, error: circleError } = await supabaseAdmin
      .from("circles")
      .select("id, name, owner_auth_id")
      .eq("id", circleId)
      .maybeSingle();

    if (circleError) {
      return NextResponse.json({ error: circleError.message }, { status: 500 });
    }

    if (!circle) {
      return NextResponse.json({ error: "Circle not found" }, { status: 404 });
    }

    if (circle.owner_auth_id !== authUserId) {
      return NextResponse.json(
        { error: "Only the circle owner can approve requests" },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();

    const { data: updatedRows, error: updateError } = await supabaseAdmin
      .from("circle_members")
      .update({
        status: "APPROVED",
        joined_at: now,
        decided_at: now,
        decided_by_auth_id: authUserId,
      })
      .eq("circle_id", circleId)
      .eq("user_auth_id", userAuthId)
      .eq("status", "PENDING")
      .select("id");

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (!updatedRows || updatedRows.length === 0) {
      const { data: existingMember, error: existingError } = await supabaseAdmin
        .from("circle_members")
        .select("id, status")
        .eq("circle_id", circleId)
        .eq("user_auth_id", userAuthId)
        .maybeSingle();

      if (existingError) {
        return NextResponse.json({ error: existingError.message }, { status: 500 });
      }

      if (!existingMember) {
        return NextResponse.json(
          { error: "Pending request not found" },
          { status: 404 }
        );
      }

      if (existingMember.status === "APPROVED") {
        return NextResponse.json(
          { error: "Member is already approved" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: `Cannot approve request with status: ${existingMember.status}` },
        { status: 409 }
      );
    }

    const { error: notifError } = await supabaseAdmin
      .from("notifications")
      .insert({
        user_auth_id: userAuthId,
        title: "Join request approved",
        message: `Your request to join "${circle.name}" has been approved.`,
        type: "JOIN_APPROVED",
      });

    if (notifError) {
      console.error("Approval notification failed:", notifError);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Member approved successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to approve request",
      },
      { status: 401 }
    );
  }
}