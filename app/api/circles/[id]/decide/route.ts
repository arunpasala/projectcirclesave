import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabase/admin";
import { requireAuthUserId } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authUserId = requireAuthUserId(req);
    const { id } = await context.params;
    const circleId = Number(id);

    if (!Number.isInteger(circleId) || circleId <= 0) {
      return NextResponse.json({ error: "Invalid circle id." }, { status: 400 });
    }

    const body = await req.json();
    const memberUserId = String(body?.memberUserId || "").trim();
    const action = String(body?.action || "").trim().toUpperCase();

    if (!memberUserId) {
      return NextResponse.json({ error: "memberUserId is required." }, { status: 400 });
    }

    if (action !== "APPROVE" && action !== "REJECT") {
      return NextResponse.json(
        { error: "Action must be APPROVE or REJECT." },
        { status: 400 }
      );
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
      return NextResponse.json({ error: "Circle not found." }, { status: 404 });
    }

    if (circle.owner_auth_id !== authUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const nextStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";
    const now = new Date().toISOString();

    const updatePayload =
      action === "APPROVE"
        ? {
            status: nextStatus,
            joined_at: now,
            decided_at: now,
            decided_by_auth_id: authUserId,
          }
        : {
            status: nextStatus,
            joined_at: null,
            decided_at: now,
            decided_by_auth_id: authUserId,
          };

    const { data: updatedRow, error: updateError } = await supabaseAdmin
      .from("circle_members")
      .update(updatePayload)
      .eq("circle_id", circleId)
      .eq("user_auth_id", memberUserId)
      .eq("status", "PENDING")
      .select("id, circle_id, user_auth_id, status")
      .maybeSingle();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (!updatedRow) {
      return NextResponse.json(
        { error: "Pending membership request not found." },
        { status: 404 }
      );
    }

    const notificationTitle =
      action === "APPROVE" ? "Join request approved" : "Join request rejected";

    const notificationMessage =
      action === "APPROVE"
        ? `Your request to join "${circle.name}" has been approved.`
        : `Your request to join "${circle.name}" has been rejected.`;

    const { error: notifError } = await supabaseAdmin.from("notifications").insert({
      user_auth_id: memberUserId,
      title: notificationTitle,
      message: notificationMessage,
      type: "JOIN_REQUEST_RESULT",
      meta: {
        circle_id: circle.id,
        decision: nextStatus,
      },
    });

    if (notifError) {
      console.error("Decision notification insert error:", notifError);
    }

    return NextResponse.json({
      success: true,
      message:
        action === "APPROVE" ? "Member approved successfully." : "Member rejected successfully.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to decide request.",
      },
      { status: 401 }
    );
  }
}