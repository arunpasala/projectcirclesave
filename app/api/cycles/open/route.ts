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

export async function POST(req: NextRequest) {
  try {
    const authUserId = getAuthUserIdFromRequest(req);

    if (!authUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const circleId = Number(body?.circle_id);

    if (!Number.isInteger(circleId) || circleId <= 0) {
      return NextResponse.json({ error: "Invalid circle_id" }, { status: 400 });
    }

    const { data: circle, error: circleError } = await admin
      .from("circles")
      .select("id, owner_auth_id, contribution_amount, name")
      .eq("id", circleId)
      .single();

    if (circleError || !circle) {
      return NextResponse.json({ error: "Circle not found" }, { status: 404 });
    }

    if (circle.owner_auth_id !== authUserId) {
      return NextResponse.json(
        { error: "Only the circle owner can open a cycle" },
        { status: 403 }
      );
    }

    const { data: existingOpenCycle, error: existingOpenCycleError } = await admin
      .from("circle_cycles")
      .select("id, status")
      .eq("circle_id", circleId)
      .in("status", ["OPEN", "READY"])
      .maybeSingle();

    if (existingOpenCycleError) {
      return NextResponse.json(
        { error: existingOpenCycleError.message },
        { status: 500 }
      );
    }

    if (existingOpenCycle) {
      return NextResponse.json(
        { error: "A monthly cycle is already active for this circle." },
        { status: 400 }
      );
    }

    const { data: nextSchedule, error: scheduleError } = await admin
      .from("payout_schedule")
      .select("*")
      .eq("circle_id", circleId)
      .neq("status", "PAID")
      .order("cycle_no", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (scheduleError) {
      return NextResponse.json({ error: scheduleError.message }, { status: 500 });
    }

    if (!nextSchedule) {
      return NextResponse.json(
        { error: "No pending payout schedule found." },
        { status: 400 }
      );
    }

    const { data: approvedMembers, error: membersError } = await admin
      .from("circle_members")
      .select("user_auth_id")
      .eq("circle_id", circleId)
      .eq("status", "APPROVED");

    if (membersError) {
      return NextResponse.json({ error: membersError.message }, { status: 500 });
    }

    if (!approvedMembers || approvedMembers.length < 2) {
      return NextResponse.json(
        { error: "At least two approved members are required." },
        { status: 400 }
      );
    }

    const totalMembers = approvedMembers.length;
    const amountPerMember = Number(circle.contribution_amount);
    const expectedTotal = amountPerMember * (totalMembers - 1);

    const monthKey = new Date().toISOString().slice(0, 7);

    const { data: newCycle, error: insertCycleError } = await admin
      .from("circle_cycles")
      .insert({
        circle_id: circleId,
        cycle_no: nextSchedule.cycle_no,
        recipient_user_id: nextSchedule.recipient_user_id,
        month_key: monthKey,
        amount_per_member: amountPerMember,
        total_members: totalMembers,
        expected_total: expectedTotal,
        status: "OPEN",
      })
      .select("*")
      .single();

    if (insertCycleError || !newCycle) {
      return NextResponse.json(
        { error: insertCycleError?.message || "Failed to open cycle" },
        { status: 500 }
      );
    }

    const payerRows = approvedMembers
      .filter((m) => m.user_auth_id !== nextSchedule.recipient_user_id)
      .map((m) => ({
        cycle_id: newCycle.id,
        circle_id: circleId,
        payer_user_id: m.user_auth_id,
        payee_user_id: nextSchedule.recipient_user_id,
        amount: amountPerMember,
        payment_method: "CASH",
        transfer_reference: null,
        payment_status: "PENDING",
        recipient_confirmed: false,
      }));

    if (payerRows.length === 0) {
      return NextResponse.json(
        { error: "No eligible payers found for this cycle." },
        { status: 400 }
      );
    }

    const { error: paymentsInsertError } = await admin
      .from("cycle_payments")
      .insert(payerRows);

    if (paymentsInsertError) {
      return NextResponse.json(
        { error: paymentsInsertError.message },
        { status: 500 }
      );
    }

    const { error: scheduleUpdateError } = await admin
      .from("payout_schedule")
      .update({ status: "OPEN" })
      .eq("id", nextSchedule.id);

    if (scheduleUpdateError) {
      return NextResponse.json(
        { error: scheduleUpdateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Monthly cycle opened successfully",
        cycle: newCycle,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/cycles/open error:", error);
    return NextResponse.json(
      { error: error?.message || "Server error" },
      { status: 500 }
    );
  }
}