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
    const cycleNo = Number(body?.cycle_no);
    const amount = Number(body?.amount);

    if (!Number.isInteger(circleId) || circleId <= 0) {
      return NextResponse.json({ error: "Invalid circle_id" }, { status: 400 });
    }

    if (!Number.isInteger(cycleNo) || cycleNo <= 0) {
      return NextResponse.json({ error: "Invalid cycle_no" }, { status: 400 });
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const { data: membership, error: membershipError } = await supabase
      .from("circle_members")
      .select("id")
      .eq("circle_id", circleId)
      .eq("user_auth_id", user.id)
      .eq("status", "APPROVED")
      .maybeSingle();

    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 500 });
    }

    if (!membership) {
      return NextResponse.json(
        { error: "You are not an approved member of this circle." },
        { status: 403 }
      );
    }

    const { data: circle, error: circleError } = await supabase
      .from("circles")
      .select("id, contribution_amount, name, owner_auth_id")
      .eq("id", circleId)
      .maybeSingle();

    if (circleError) {
      return NextResponse.json({ error: circleError.message }, { status: 500 });
    }

    if (!circle) {
      return NextResponse.json({ error: "Circle not found." }, { status: 404 });
    }

    if (Number(circle.contribution_amount) !== amount) {
      return NextResponse.json(
        { error: `Contribution must be exactly ${circle.contribution_amount}` },
        { status: 400 }
      );
    }

    const { data: existing, error: existingError } = await supabase
      .from("contributions")
      .select("id")
      .eq("circle_id", circleId)
      .eq("user_auth_id", user.id)
      .eq("cycle_no", cycleNo)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json(
        { error: "Contribution already submitted for this cycle." },
        { status: 409 }
      );
    }

    const { data: contribution, error: insertError } = await supabase
      .from("contributions")
      .insert({
        circle_id: circleId,
        user_auth_id: user.id,
        cycle_no: cycleNo,
        amount,
        status: "PAID",
      })
      .select("*")
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    if (circle.owner_auth_id && circle.owner_auth_id !== user.id) {
      await supabase.from("notifications").insert({
        user_auth_id: circle.owner_auth_id,
        title: "New contribution received",
        message: `A member contributed for cycle ${cycleNo} in "${circle.name}".`,
        type: "CONTRIBUTION_RECEIVED",
      });
    }

    return NextResponse.json({ success: true, contribution }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add contribution." },
      { status: 500 }
    );
  }
}