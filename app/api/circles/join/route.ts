import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import supabaseAdmin from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type TokenPayload = {
  userId: number;
  authUserId: string | null;
  email: string;
  role: "ADMIN" | "USER";
};

function getUserFromRequest(req: NextRequest): TokenPayload {
  const authHeader = req.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  const token = authHeader.replace("Bearer ", "").trim();

  return jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);

    if (!user?.authUserId) {
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

    if (circle.owner_auth_id === user.authUserId) {
      return NextResponse.json(
        { error: "You already own this circle." },
        { status: 409 }
      );
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("circle_members")
      .select("id, status")
      .eq("circle_id", circleId)
      .eq("user_auth_id", user.authUserId)
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
      const { error: updateError } = await supabaseAdmin
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
      const { error: insertError } = await supabaseAdmin
        .from("circle_members")
        .insert({
          circle_id: circleId,
          user_auth_id: user.authUserId,
          role: "MEMBER",
          status: "PENDING",
          requested_at: new Date().toISOString(),
        });

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.authUserId)
      .maybeSingle();

    await supabaseAdmin.from("notifications").insert({
      user_auth_id: circle.owner_auth_id,
      title: "New join request",
      message: `${
        profile?.full_name || profile?.email || "A user"
      } requested to join "${circle.name}".`,
      type: "JOIN_REQUEST",
      meta: {
        circle_id: circle.id,
        requester_user_id: user.authUserId,
      },
    });

    await supabaseAdmin.from("audit_logs").insert({
      actor_user_id: user.authUserId,
      action: "JOIN_CIRCLE_REQUEST",
      action_type: "JOIN_CIRCLE_REQUEST",
      status: "success",
      circle_id: circle.id,
      metadata: {
        requester_user_id: user.authUserId,
        requester_email: user.email,
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
    const msg =
      error instanceof Error ? error.message : "Failed to join circle.";

    return NextResponse.json(
      { error: msg },
      { status: msg === "Unauthorized" ? 401 : 500 }
    );
  }
}