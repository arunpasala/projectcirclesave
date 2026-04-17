import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const USERS_AUTH_COLUMN = "auth_user_id";

function invoiceNo(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

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
    };

    const authUserId = payload.authUserId || payload.sub || null;
    if (!authUserId) return null;

    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }

    return authUserId;
  } catch (err) {
    console.error("COMPLETE TOKEN DECODE ERROR:", err);
    return null;
  }
}

function sumPaymentAmounts(
  payments: Array<{ amount?: number | string | null }> | null | undefined
) {
  return (payments || []).reduce((sum, payment) => {
    return sum + Number(payment?.amount || 0);
  }, 0);
}

function isUuid(value: unknown): boolean {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}

function isPositiveIntegerLike(value: unknown): boolean {
  return typeof value === "number"
    ? Number.isInteger(value) && value > 0
    : typeof value === "string" && /^\d+$/.test(value);
}

async function findUserByAuthId(authId: string) {
  const { data, error } = await supabase
    .from("users")
    .select(`id, ${USERS_AUTH_COLUMN}`)
    .eq(USERS_AUTH_COLUMN, authId)
    .single();

  return { data, error };
}

async function resolveRecipient(cycle: any) {
  let recipientUserId: number | null = null;
  let recipientAuthId: string | null = null;

  const rawRecipientValue =
    cycle.recipient_auth_id ?? cycle.recipient_user_id ?? null;

  if (isPositiveIntegerLike(rawRecipientValue)) {
    recipientUserId = Number(rawRecipientValue);

    const { data: recipientUser, error: recipientUserError } = await supabase
      .from("users")
      .select(`id, ${USERS_AUTH_COLUMN}`)
      .eq("id", recipientUserId)
      .single();

    if (recipientUserError || !recipientUser) {
      return {
        error: "Recipient user record not found",
        details: recipientUserError,
        recipientUserId: null,
        recipientAuthId: null,
      };
    }

    recipientAuthId = recipientUser[USERS_AUTH_COLUMN] ?? null;
  } else if (isUuid(rawRecipientValue)) {
    recipientAuthId = String(rawRecipientValue);

    const { data: recipientUser, error: recipientUserError } =
      await findUserByAuthId(recipientAuthId);

    if (recipientUserError || !recipientUser) {
      return {
        error:
          "Recipient user mapping failed. No internal user row matches the auth UUID.",
        details: recipientUserError,
        recipientUserId: null,
        recipientAuthId: null,
      };
    }

    recipientUserId = recipientUser.id;
  } else {
    return {
      error: "Invalid recipient identity on cycle record",
      details: null,
      recipientUserId: null,
      recipientAuthId: null,
    };
  }

  return {
    error: null,
    details: null,
    recipientUserId,
    recipientAuthId,
  };
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

    const { data: cycle, error: cycleError } = await supabase
      .from("circle_cycles")
      .select("*")
      .eq("id", cycleIdNum)
      .single();

    if (cycleError || !cycle) {
      return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
    }

    const { data: circle, error: circleError } = await supabase
      .from("circles")
      .select("id, owner_auth_id, name")
      .eq("id", cycle.circle_id)
      .single();

    if (circleError || !circle) {
      return NextResponse.json({ error: "Circle not found" }, { status: 404 });
    }

    if (circle.owner_auth_id !== authUserId) {
      return NextResponse.json(
        { error: "Only the circle owner can complete the cycle" },
        { status: 403 }
      );
    }

    if (cycle.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Cycle already completed" },
        { status: 400 }
      );
    }

    if (cycle.status !== "READY") {
      return NextResponse.json(
        { error: `Cycle is not ready. Current status: ${cycle.status}` },
        { status: 400 }
      );
    }

    const { data: payments, error: paymentsError } = await supabase
      .from("cycle_payments")
      .select("*")
      .eq("cycle_id", cycleIdNum);

    if (paymentsError) {
      console.error("Payments fetch failed:", paymentsError);
      return NextResponse.json(
        { error: "Failed to load cycle payments" },
        { status: 500 }
      );
    }

    if (!Array.isArray(payments) || payments.length === 0) {
      return NextResponse.json(
        { error: "No payments found for this cycle" },
        { status: 400 }
      );
    }

    const allConfirmed = payments.every(
      (p: any) => p?.payment_status === "CONFIRMED"
    );

    if (!allConfirmed) {
      return NextResponse.json(
        {
          error:
            "All payments must be confirmed by the recipient before completion",
        },
        { status: 400 }
      );
    }

    const totalAmount = Number(cycle.expected_total ?? sumPaymentAmounts(payments));

    // Resolve recipient once and reuse everywhere
    const recipientResolution = await resolveRecipient(cycle);

    if (recipientResolution.error) {
      console.error("Recipient resolution failed:", recipientResolution.details);
      return NextResponse.json(
        { error: recipientResolution.error },
        { status: 500 }
      );
    }

    const recipientUserId = recipientResolution.recipientUserId!;
    const recipientAuthId = recipientResolution.recipientAuthId;

    const { data: existingPayout, error: existingPayoutError } = await supabase
      .from("payouts")
      .select("circle_id, cycle_no, status")
      .eq("circle_id", cycle.circle_id)
      .eq("cycle_no", cycle.cycle_no)
      .maybeSingle();

    if (existingPayoutError) {
      console.error("Existing payout lookup failed:", existingPayoutError);
      return NextResponse.json(
        { error: "Failed to check existing payout" },
        { status: 500 }
      );
    }

    if (!existingPayout) {
      const { data: actorUser, error: actorUserError } = await findUserByAuthId(authUserId);

      if (actorUserError || !actorUser) {
        console.error("Actor user lookup by auth id failed:", actorUserError);
        return NextResponse.json(
          {
            error:
              "Owner user mapping failed. No internal user row matches the auth UUID.",
          },
          { status: 500 }
        );
      }

      const payoutPayload = {
        circle_id: cycle.circle_id,
        cycle_no: cycle.cycle_no,
        recipient_user_id: recipientUserId,
        recipient_auth_id: recipientAuthId,
        selected_by: actorUser.id,
        selected_by_auth_id: authUserId,
        method: "SYSTEM",
        amount: totalAmount,
        status: "COMPLETED",
      };

      const { error: payoutInsertError } = await supabase
        .from("payouts")
        .insert(payoutPayload);

      if (payoutInsertError) {
        console.error("Payout insert failed:", payoutInsertError);
        return NextResponse.json(
          {
            error: "Failed to create payout record",
            details: payoutInsertError.message,
          },
          { status: 500 }
        );
      }
    }

    const { error: cycleUpdateError } = await supabase
      .from("circle_cycles")
      .update({
        status: "COMPLETED",
        closed_at: new Date().toISOString(),
      })
      .eq("id", cycleIdNum)
      .neq("status", "COMPLETED");

    if (cycleUpdateError) {
      console.error("Cycle update failed:", cycleUpdateError);
      return NextResponse.json(
        { error: "Failed to update cycle" },
        { status: 500 }
      );
    }

    const { error: scheduleUpdateError } = await supabase
      .from("payout_schedule")
      .update({ status: "PAID" })
      .eq("circle_id", cycle.circle_id)
      .eq("cycle_no", cycle.cycle_no);

    if (scheduleUpdateError) {
      console.error("Schedule update failed:", scheduleUpdateError);
      return NextResponse.json(
        { error: "Failed to update payout schedule" },
        { status: 500 }
      );
    }

    // Invoice generation
    try {
      const payerInvoices = payments.map((p: any) => ({
        circle_id: cycle.circle_id,
        cycle_id: cycle.id,
        invoice_type: "PAYER_RECEIPT",
        user_id: p.payer_user_id,
        invoice_no: invoiceNo("PAY"),
        amount: Number(p?.amount || 0),
        metadata: {
          payee_user_id: p.payee_user_id,
          payment_method: p.payment_method,
          transfer_reference: p.transfer_reference,
          cycle_no: cycle.cycle_no,
        },
      }));

      const recipientInvoice = {
        circle_id: cycle.circle_id,
        cycle_id: cycle.id,
        invoice_type: "RECIPIENT_SUMMARY",
        user_id: recipientUserId, // FIXED
        invoice_no: invoiceNo("REC"),
        amount: totalAmount,
        metadata: {
          cycle_no: cycle.cycle_no,
          month_key: cycle.month_key,
        },
      };

      console.log("Recipient invoice payload:", recipientInvoice);

      const { error: invoiceError } = await supabase
        .from("invoices")
        .insert([...payerInvoices, recipientInvoice]);

      if (invoiceError) {
        console.error("Invoice insert failed:", invoiceError);
      }
    } catch (error) {
      console.error("Invoice generation failed:", error);
    }

    // Audit log
    try {
      const auditPayload = {
        actor_user_id: authUserId,
        action: "CYCLE_COMPLETED", // FIXED
        action_type: "CYCLE_COMPLETED",
        circle_id: cycle.circle_id,
        target_id: String(cycle.id),
        metadata: {
          cycleNo: cycle.cycle_no,
          recipientUserId,
          paymentCount: payments.length,
        },
      };

      console.log("Audit payload:", auditPayload);

      const { error: auditError } = await supabase
        .from("audit_logs")
        .insert(auditPayload);

      if (auditError) {
        console.error("Audit log insert failed:", auditError);
      }
    } catch (error) {
      console.error("Audit log failed:", error);
    }

    // Notification
    try {
      if (recipientAuthId && isUuid(recipientAuthId)) {
        const { error: notifError } = await supabase.from("notifications").insert({
          user_auth_id: recipientAuthId,
          title: "Cycle Completed",
          message: `Cycle ${cycle.cycle_no} in circle "${circle.name}" has been completed.`,
          read: false,
        });

        if (notifError) {
          console.error("Notification creation failed:", notifError);
        }
      }
    } catch (error) {
      console.error("Notification failed:", error);
    }

    return NextResponse.json({
      message: "Cycle completed successfully",
    });
  } catch (error: any) {
    console.error("COMPLETE CYCLE ERROR FULL:", error);
    return NextResponse.json(
      { error: "Unexpected server error during cycle completion" },
      { status: 500 }
    );
  }
}