import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const circleId = Number(body?.circle_id);

    if (!Number.isInteger(circleId) || circleId <= 0) {
      return NextResponse.json(
        { error: "Valid circle_id is required." },
        { status: 400 }
      );
    }

    const { data: circle, error: circleError } = await supabase
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

    if (circle.owner_auth_id === user.id) {
      return NextResponse.json(
        { error: "You already own this circle." },
        { status: 409 }
      );
    }

    const { data: existing, error: existingError } = await supabase
      .from("circle_members")
      .select("id, status")
      .eq("circle_id", circleId)
      .eq("user_auth_id", user.id)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    if (existing?.status === "APPROVED") {
      return NextResponse.json(
        { error: "You are already a member of this circle." },
        { status: 409 }
      );
    }

    if (existing?.status === "PENDING") {
      return NextResponse.json(
        {
          success: true,
          message: "Request already submitted.",
          status: "PENDING",
        },
        { status: 200 }
      );
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from("circle_members")
        .update({
          status: "PENDING",
          requested_at: new Date().toISOString(),
          joined_at: null,
          decided_at: null,
          decided_by_auth_id: null,
        })
        .eq("id", existing.id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    } else {
      const { error: insertError } = await supabase
        .from("circle_members")
        .insert({
          circle_id: circleId,
          user_auth_id: user.id,
          role: "MEMBER",
          status: "PENDING",
          requested_at: new Date().toISOString(),
        });

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .maybeSingle();

    await supabase.from("notifications").insert({
      user_auth_id: circle.owner_auth_id,
      title: "New join request",
      message: `${
        profile?.full_name || profile?.email || "A user"
      } requested to join "${circle.name}".`,
      type: "JOIN_REQUEST",
      meta: {
        circle_id: circle.id,
        requester_user_id: user.id,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Join request submitted.",
        status: "PENDING",
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to join circle.",
      },
      { status: 500 }
    );
  }
}