import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(_req: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const payoutId = Number(id);

    if (!Number.isInteger(payoutId) || payoutId <= 0) {
      return NextResponse.json({ error: "Invalid payout ID." }, { status: 400 });
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: payout, error: payoutError } = await supabase
      .from("payouts")
      .select("id, circle_id, cycle_no, recipient_auth_id, status, amount")
      .eq("id", payoutId)
      .maybeSingle();

    if (payoutError) {
      return NextResponse.json({ error: payoutError.message }, { status: 500 });
    }

    if (!payout) {
      return NextResponse.json({ error: "Payout not found." }, { status: 404 });
    }

    const { data: circle, error: circleError } = await supabase
      .from("circles")
      .select("id, name, owner_auth_id")
      .eq("id", payout.circle_id)
      .maybeSingle();

    if (circleError) {
      return NextResponse.json({ error: circleError.message }, { status: 500 });
    }

    if (!circle) {
      return NextResponse.json({ error: "Circle not found." }, { status: 404 });
    }

    if (circle.owner_auth_id !== user.id) {
      return NextResponse.json({ error: "Only the owner can execute payout." }, { status: 403 });
    }

    if (payout.status === "PAID") {
      return NextResponse.json({ error: "Payout already completed." }, { status: 409 });
    }

    const { error: updateError } = await supabase
      .from("payouts")
      .update({
        status: "PAID",
        paid_at: new Date().toISOString(),
      })
      .eq("id", payoutId)
      .neq("status", "PAID");

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await supabase.from("notifications").insert({
      user_auth_id: payout.recipient_auth_id,
      title: "Payout completed",
      message: `Your payout for cycle ${payout.cycle_no} has been completed.`,
      type: "PAYOUT_COMPLETED",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to execute payout." },
      { status: 500 }
    );
  }
}