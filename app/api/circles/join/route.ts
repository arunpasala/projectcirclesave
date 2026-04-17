import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabase/admin";
import { requireAuthUserId } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const authUserId = requireAuthUserId(req);

    const body = await req.json();
    const circleId = Number(body?.circle_id);

    if (!Number.isInteger(circleId) || circleId <= 0) {
      return NextResponse.json({ error: "Invalid circle_id" }, { status: 400 });
    }

    // check if circle exists
    const { data: circle, error: circleError } = await supabaseAdmin
      .from("circles")
      .select("id, name")
      .eq("id", circleId)
      .maybeSingle();

    if (circleError) {
      return NextResponse.json({ error: circleError.message }, { status: 500 });
    }

    if (!circle) {
      return NextResponse.json({ error: "Circle not found" }, { status: 404 });
    }

    // 🔒 CONCURRENCY-SAFE CHECK
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("circle_members")
      .select("id, status")
      .eq("circle_id", circleId)
      .eq("user_auth_id", authUserId)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    if (existing) {
      if (existing.status === "APPROVED") {
        return NextResponse.json(
          { error: "You are already a member of this circle" },
          { status: 409 }
        );
      }

      if (existing.status === "PENDING") {
        return NextResponse.json(
          { error: "Join request already submitted" },
          { status: 409 }
        );
      }
    }

    // insert request
    const { error: insertError } = await supabaseAdmin
      .from("circle_members")
      .insert({
        circle_id: circleId,
        user_auth_id: authUserId,
        role: "MEMBER",
        status: "PENDING",
        requested_at: new Date().toISOString(),
      });

    if (insertError) {
      // handle race condition (duplicate insert)
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "Join request already exists" },
          { status: 409 }
        );
      }

      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // notify owner
    const { data: owner } = await supabaseAdmin
      .from("circles")
      .select("owner_auth_id")
      .eq("id", circleId)
      .maybeSingle();

    if (owner?.owner_auth_id) {
      await supabaseAdmin.from("notifications").insert({
        user_auth_id: owner.owner_auth_id,
        title: "New Join Request",
        message: `A new user requested to join "${circle.name}"`,
        type: "JOIN_REQUEST",
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Join request submitted successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to join circle",
      },
      { status: 401 }
    );
  }
}