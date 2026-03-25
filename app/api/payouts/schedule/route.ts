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

    if (!Number.isInteger(circleId) || circleId <= 0) {
      return NextResponse.json({ error: "Invalid circle_id" }, { status: 400 });
    }

    if (!Number.isInteger(cycleNo) || cycleNo <= 0) {
      return NextResponse.json({ error: "Invalid cycle_no" }, { status: 400 });
    }

    const { data: circle, error: circleError } = await supabase
      .from("circles")
      .select("id, name, owner_auth_id, contribution_amount")
      .eq("id", circleId)
      .maybeSingle();

    if (circleError) {
      return NextResponse.json({ error: circleError.message }, { status: 500 });
    }

    if (!circle) {
      return NextResponse.json({ error: "Circle not found" }, { status: 404 });
    }

    if (circle.owner_auth_id !== user.id) {
      return NextResponse.json(
        { error: "Only the circle owner can schedule payouts." },
        { status: 403 }
      );
    }

    const { data: existingPayout, error: existingPayoutError } = await supabase
      .from("payouts")
      .select("id")
      .eq("circle_id", circleId)
      .eq("cycle_no", cycleNo)
      .maybeSingle();

    if (existingPayoutError) {
      return NextResponse.json({ error: existingPayoutError.message }, { status: 500 });
    }

    if (existingPayout) {
      return NextResponse.json({ error: "Payout already exists for this cycle." }, { status: 409 });
    }

    const { data: members, error: membersError } = await supabase
      .from("circle_members")
      .select("user_auth_id, joined_at")
      .eq("circle_id", circleId)
      .eq("status", "APPROVED")
      .order("joined_at", { ascending: true });

    if (membersError) {
      return NextResponse.json({ error: membersError.message }, { status: 500 });
    }

    if (!members || members.length === 0) {
      return NextResponse.json({ error: "No approved members found." }, { status: 400 });
    }

    const { data: priorPayouts, error: priorPayoutsError } = await supabase
      .from("payouts")
      .select("recipient_auth_id, cycle_no")
      .eq("circle_id", circleId)
      .order("cycle_no", { ascending: true });

    if (priorPayoutsError) {
      return NextResponse.json({ error: priorPayoutsError.message }, { status: 500 });
    }

    const alreadyPaidSet = new Set((priorPayouts ?? []).map((p) => p.recipient_auth_id));

    const nextRecipient = members.find((member) => !alreadyPaidSet.has(member.user_auth_id));

    if (!nextRecipient) {
      return NextResponse.json(
        { error: "All approved members already received payout." },
        { status: 409 }
      );
    }

    const approvedMemberCount = members.length;
    const payoutAmount = Number(circle.contribution_amount) * approvedMemberCount;

    const { data: payout, error: insertError } = await supabase
      .from("payouts")
      .insert({
        circle_id: circleId,
        cycle_no: cycleNo,
        recipient_auth_id: nextRecipient.user_auth_id,
        selected_by_auth_id: user.id,
        method: "ROTATION",
        status: "PENDING",
        amount: payoutAmount,
      })
      .select("*")
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    await supabase.from("notifications").insert({
      user_auth_id: nextRecipient.user_auth_id,
      title: "Payout scheduled",
      message: `You have been scheduled to receive payout for cycle ${cycleNo}.`,
      type: "PAYOUT_SCHEDULED",
    });

    return NextResponse.json({ success: true, payout }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to schedule payout." },
      { status: 500 }
    );
  }
}