import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabase/admin";
import { requireAuthUserId } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const userId = requireAuthUserId(req);
    const body = await req.json();

    const circleId = Number(body?.circle_id);
    const acceptedTerms = Boolean(body?.accepted_terms);

    if (!Number.isInteger(circleId) || circleId <= 0) {
      return NextResponse.json({ error: "Invalid circle_id" }, { status: 400 });
    }

    if (!acceptedTerms) {
      return NextResponse.json(
        { error: "You must accept the Terms & Conditions before joining." },
        { status: 400 }
      );
    }

    // Block restricted users
    const { data: userRow, error: userError } = await supabaseAdmin
      .from("users")
      .select("is_restricted, restriction_reason")
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    if (userRow?.is_restricted) {
      return NextResponse.json(
        {
          error:
            userRow.restriction_reason ||
            "Your account is restricted from joining circles.",
        },
        { status: 403 }
      );
    }

    // Prevent users with overdue unpaid contributions from joining new circles
    const { data: overduePayments, error: overdueError } = await supabaseAdmin
      .from("cycle_payments")
      .select("id")
      .eq("payer_user_id", userId)
      .eq("is_overdue", true)
      .limit(1);

    if (overdueError) {
      return NextResponse.json({ error: overdueError.message }, { status: 500 });
    }

    if ((overduePayments ?? []).length > 0) {
      return NextResponse.json(
        {
          error:
            "You have overdue unpaid contributions. Clear them before joining a new circle.",
        },
        { status: 403 }
      );
    }

    // Prevent duplicate request/member row
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("circle_members")
      .select("id, status")
      .eq("circle_id", circleId)
      .eq("user_auth_id", userId)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json(
        { error: `You already have a ${existing.status} membership/request.` },
        { status: 409 }
      );
    }

    const { error: insertError } = await supabaseAdmin
      .from("circle_members")
      .insert({
        circle_id: circleId,
        user_auth_id: userId,
        role: "MEMBER",
        status: "PENDING",
        accepted_terms: true,
        accepted_at: new Date().toISOString(),
      });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Audit log
    await supabaseAdmin.from("audit_logs").insert({
      actor_user_id: userId,
      action_type: "ACCEPT_TERMS_AND_JOIN_REQUEST",
      circle_id: circleId,
      status: "SUCCESS",
      metadata: {
        accepted_terms: true,
      },
      ip_address: req.headers.get("x-forwarded-for") || "unknown",
      user_agent: req.headers.get("user-agent") || "unknown",
    });

    return NextResponse.json({
      message: "Join request sent successfully.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to join circle" },
      { status: error?.message === "Unauthorized" ? 401 : 500 }
    );
  }
}