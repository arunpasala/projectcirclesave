import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getAuthUserIdFromRequest(req: NextRequest): string | null {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

    const token = authHeader.slice("Bearer ".length).trim();
    const parts = token.split(".");
    if (parts.length < 2) return null;

    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const payloadJson = Buffer.from(padded, "base64").toString("utf8");

    const payload = JSON.parse(payloadJson) as {
      authUserId?: string;
      sub?: string;
      exp?: number;
    };

    const authUserId = payload.authUserId || payload.sub || null;
    if (!authUserId) return null;

    if (payload.exp && Date.now() >= payload.exp * 1000) return null;

    return authUserId;
  } catch {
    return null;
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ cycleId: string }> }
) {
  try {
    const authUserId = getAuthUserIdFromRequest(req);
    if (!authUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { cycleId } = await context.params;
    const cycleIdNum = Number(cycleId);
    if (!Number.isInteger(cycleIdNum) || cycleIdNum <= 0) {
      return NextResponse.json({ error: "Invalid cycle id" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const paymentId = Number(body?.payment_id);

    if (!Number.isInteger(paymentId) || paymentId <= 0) {
      return NextResponse.json({ error: "Invalid payment_id" }, { status: 400 });
    }

    const { data: cycle, error: cycleError } = await admin
      .from("circle_cycles")
      .select("id, circle_id, cycle_no, recipient_user_id, status")
      .eq("id", cycleIdNum)
      .single();

    if (cycleError || !cycle) {
      return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
    }

    if (cycle.recipient_user_id !== authUserId) {
      return NextResponse.json(
        { error: "Only the recipient can confirm payment receipt" },
        { status: 403 }
      );
    }

    const { data: payment, error: paymentError } = await admin
      .from("cycle_payments")
      .select("*")
      .eq("id", paymentId)
      .eq("cycle_id", cycleIdNum)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (payment.payment_status !== "SUBMITTED") {
      return NextResponse.json(
        { error: `Payment cannot be confirmed from status ${payment.payment_status}` },
        { status: 400 }
      );
    }

    const { data: updatedPayment, error: updateError } = await admin
      .from("cycle_payments")
      .update({
        payment_status: "CONFIRMED",
        recipient_confirmed: true,
        recipient_confirmed_at: new Date().toISOString(),
        recipient_confirmed_by: authUserId,
      })
      .eq("id", paymentId)
      .select("*")
      .single();

    if (updateError || !updatedPayment) {
      return NextResponse.json(
        { error: updateError?.message || "Failed to confirm payment" },
        { status: 500 }
      );
    }

    const { data: approvedMembers, error: approvedMembersError } = await admin
      .from("circle_members")
      .select("user_auth_id")
      .eq("circle_id", cycle.circle_id)
      .eq("status", "APPROVED");

    if (approvedMembersError) {
      return NextResponse.json(
        { error: approvedMembersError.message },
        { status: 500 }
      );
    }

    const requiredPayers =
      approvedMembers?.filter((m) => m.user_auth_id !== cycle.recipient_user_id) || [];

    const { data: confirmedPayments, error: confirmedPaymentsError } = await admin
      .from("cycle_payments")
      .select("payer_user_id")
      .eq("cycle_id", cycleIdNum)
      .eq("payment_status", "CONFIRMED");

    if (confirmedPaymentsError) {
      return NextResponse.json(
        { error: confirmedPaymentsError.message },
        { status: 500 }
      );
    }

    const confirmedPayerIds = new Set((confirmedPayments || []).map((p) => p.payer_user_id));
    const allConfirmed = requiredPayers.every((m) => confirmedPayerIds.has(m.user_auth_id));

    if (allConfirmed) {
      const { error: cycleUpdateError } = await admin
        .from("circle_cycles")
        .update({ status: "READY" })
        .eq("id", cycleIdNum);

      if (cycleUpdateError) {
        return NextResponse.json(
          { error: cycleUpdateError.message },
          { status: 500 }
        );
      }
    }

    const { error: notifError } = await admin.from("notifications").insert({
      user_auth_id: payment.payer_user_id,
      title: "Payment Confirmed",
      message: `Your contribution for cycle ${cycle.cycle_no} was confirmed by the recipient.`,
      read: false,
    });

    if (notifError) {
      console.error("Notification insert failed:", notifError);
    }

    return NextResponse.json(
      {
        message: allConfirmed
          ? "Payment confirmed. All payments are confirmed and the cycle is READY."
          : "Payment confirmed successfully.",
        payment: updatedPayment,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("POST /api/cycles/[cycleId]/confirm-receipt error:", error);
    return NextResponse.json(
      { error: error?.message || "Server error" },
      { status: 500 }
    );
  }
}