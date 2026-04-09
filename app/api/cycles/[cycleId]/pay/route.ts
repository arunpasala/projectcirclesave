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

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) return null;

    const parts = token.split(".");
    if (parts.length < 2) return null;

    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);

    const payloadJson = Buffer.from(padded, "base64").toString("utf8");
    const payload = JSON.parse(payloadJson) as {
      authUserId?: string;
      sub?: string;
      exp?: number;
      email?: string;
      role?: string;
    };

    const authUserId = payload.authUserId || payload.sub || null;
    if (!authUserId) return null;

    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }

    return authUserId;
  } catch (err) {
    console.error("PAY TOKEN DECODE ERROR:", err);
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
    const paymentMethod = String(body?.payment_method || "CASH");
    const transferReference = body?.transfer_reference
      ? String(body.transfer_reference)
      : null;

    const { data: cycle, error: cycleError } = await admin
      .from("circle_cycles")
      .select(
        "id, circle_id, cycle_no, recipient_user_id, amount_per_member, expected_total, month_key, status"
      )
      .eq("id", cycleIdNum)
      .single();

    if (cycleError || !cycle) {
      return NextResponse.json(
        { error: cycleError?.message || "Cycle not found" },
        { status: 404 }
      );
    }

    if (cycle.status !== "OPEN") {
      return NextResponse.json(
        { error: `Payments are not allowed. Current cycle status: ${cycle.status}` },
        { status: 400 }
      );
    }

    if (cycle.recipient_user_id === authUserId) {
      return NextResponse.json(
        { error: "Recipient does not need to submit payment for this cycle" },
        { status: 400 }
      );
    }

    const { data: member, error: memberError } = await admin
      .from("circle_members")
      .select("id, user_auth_id, status, role")
      .eq("circle_id", cycle.circle_id)
      .eq("user_auth_id", authUserId)
      .eq("status", "APPROVED")
      .maybeSingle();

    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    if (!member) {
      return NextResponse.json(
        { error: "Only approved members can submit payment" },
        { status: 403 }
      );
    }

    const { data: existingPayment, error: existingPaymentError } = await admin
      .from("cycle_payments")
      .select("id, payment_status")
      .eq("cycle_id", cycleIdNum)
      .eq("payer_user_id", authUserId)
      .maybeSingle();

    if (existingPaymentError) {
      return NextResponse.json(
        { error: existingPaymentError.message },
        { status: 500 }
      );
    }

    let paymentRecord: any = null;

    if (existingPayment) {
      if (existingPayment.payment_status === "PENDING") {
        const { data: updatedPayment, error: updatePaymentError } = await admin
          .from("cycle_payments")
          .update({
            payment_method: paymentMethod,
            transfer_reference: transferReference,
            payment_status: "SUBMITTED",
          })
          .eq("id", existingPayment.id)
          .select("*")
          .single();

        if (updatePaymentError || !updatedPayment) {
          return NextResponse.json(
            { error: updatePaymentError?.message || "Failed to update payment" },
            { status: 500 }
          );
        }

        paymentRecord = updatedPayment;
      } else {
        return NextResponse.json(
          { error: "Payment already submitted for this cycle" },
          { status: 409 }
        );
      }
    } else {
      const { data: insertedPayment, error: insertError } = await admin
        .from("cycle_payments")
        .insert({
          cycle_id: cycleIdNum,
          circle_id: cycle.circle_id,
          payer_user_id: authUserId,
          payee_user_id: cycle.recipient_user_id,
          amount: cycle.amount_per_member,
          payment_method: paymentMethod,
          transfer_reference: transferReference,
          payment_status: "SUBMITTED",
          recipient_confirmed: false,
        })
        .select("*")
        .single();

      if (insertError || !insertedPayment) {
        return NextResponse.json(
          { error: insertError?.message || "Failed to submit payment" },
          { status: 500 }
        );
      }

      paymentRecord = insertedPayment;
    }

    const { error: notifError } = await admin.from("notifications").insert({
      user_auth_id: cycle.recipient_user_id,
      title: "Payment Submitted",
      message: `A member submitted payment for cycle ${cycle.cycle_no}. Please confirm receipt.`,
      read: false,
    });

    if (notifError) {
      console.error("Notification creation failed:", notifError);
    }

    return NextResponse.json(
      {
        message: "Payment submitted successfully. Waiting for recipient confirmation.",
        payment: paymentRecord,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/cycles/[cycleId]/pay error:", error);
    return NextResponse.json(
      { error: error?.message || "Server error" },
      { status: 500 }
    );
  }
}