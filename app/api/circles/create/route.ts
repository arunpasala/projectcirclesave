import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabase/admin";
import { requireAuthUserId } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const authUserId = requireAuthUserId(req);

    const body = await req.json();
    const name = String(body?.name ?? "").trim();
    const contributionAmount = Number(body?.contribution_amount ?? 0);

    if (!name) {
      return NextResponse.json(
        { error: "Circle name is required." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(contributionAmount) || contributionAmount <= 0) {
      return NextResponse.json(
        { error: "Contribution amount must be greater than 0." },
        { status: 400 }
      );
    }

    const { data: circle, error: circleError } = await supabaseAdmin
      .from("circles")
      .insert({
        name,
        contribution_amount: contributionAmount,
        owner_auth_id: authUserId,
      })
      .select("id, name, contribution_amount, created_at, owner_auth_id")
      .single();

    if (circleError || !circle) {
      console.error("Circle insert error:", circleError);
      return NextResponse.json(
        { error: circleError?.message ?? "Failed to create circle." },
        { status: 500 }
      );
    }

    const now = new Date().toISOString();

    const { error: memberError } = await supabaseAdmin
      .from("circle_members")
      .insert({
        circle_id: circle.id,
        user_auth_id: authUserId,
        role: "OWNER",
        status: "APPROVED",
        requested_at: now,
        joined_at: now,
        decided_at: now,
        decided_by_auth_id: authUserId,
      });

    if (memberError) {
      console.error("Owner membership insert error:", memberError);
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    const { error: notifError } = await supabaseAdmin
      .from("notifications")
      .insert({
        user_auth_id: authUserId,
        title: "Circle created",
        message: `Your circle "${circle.name}" has been created successfully.`,
        type: "SYSTEM",
      });

    if (notifError) {
      console.error("Notification insert error:", notifError);
    }

    return NextResponse.json({ circle }, { status: 201 });
  } catch (error) {
    console.error("Create circle unexpected error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create circle.",
      },
      { status: 401 }
    );
  }
}