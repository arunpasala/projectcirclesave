import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
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
      userId?: string | number;
      authUserId?: string;
      sub?: string;
      exp?: number;
    };

    console.log("TOKEN PAYLOAD:", payload);

    // IMPORTANT:
    // owner_auth_id in circles table is Supabase auth UUID,
    // so we must use authUserId/sub, NOT numeric userId.
    const authUserId = payload.authUserId || payload.sub || null;

    if (!authUserId) return null;

    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }

    return authUserId;
  } catch (err) {
    console.error("TOKEN DECODE ERROR:", err);
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
      .select("id, owner_auth_id, fairness_mode")
      .eq("id", circleId)
      .single();

    if (circleError || !circle) {
      return NextResponse.json({ error: "Circle not found" }, { status: 404 });
    }

    console.log("owner_auth_id:", circle.owner_auth_id);
    console.log("authUserId:", authUserId);

    if (circle.owner_auth_id !== authUserId) {
      return NextResponse.json(
        { error: "Only the circle owner can generate payout schedule" },
        { status: 403 }
      );
    }

    const { data: existingSchedule, error: existingError } = await admin
      .from("payout_schedule")
      .select("id")
      .eq("circle_id", circleId)
      .limit(1);

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    if (existingSchedule && existingSchedule.length > 0) {
      return NextResponse.json(
        { error: "Payout schedule already exists" },
        { status: 400 }
      );
    }

    const { data: approvedMembers, error: membersError } = await admin
      .from("circle_members")
      .select("user_auth_id, joined_at")
      .eq("circle_id", circleId)
      .eq("status", "APPROVED")
      .order("joined_at", { ascending: true });

    if (membersError) {
      return NextResponse.json({ error: membersError.message }, { status: 500 });
    }

    if (!approvedMembers || approvedMembers.length < 2) {
      return NextResponse.json(
        { error: "At least two approved members are required" },
        { status: 400 }
      );
    }

    const fairnessMode = circle.fairness_mode || "RANDOM_FIXED";

    let orderedMembers = approvedMembers.map((m) => m.user_auth_id);

    if (fairnessMode === "RANDOM_FIXED") {
      orderedMembers = shuffle(orderedMembers);
    } else if (fairnessMode === "JOIN_ORDER") {
      orderedMembers = approvedMembers.map((m) => m.user_auth_id);
    }

    const rows = orderedMembers.map((recipientUserId, index) => ({
      circle_id: circleId,
      cycle_no: index + 1,
      recipient_user_id: recipientUserId,
      schedule_position: index + 1,
      status: "PENDING",
    }));

    const { error: insertError } = await admin
      .from("payout_schedule")
      .insert(rows);

    if (insertError) {
      return NextResponse.json(
        { error: `schedule insert failed: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Payout schedule generated successfully",
        fairness_mode: fairnessMode,
        cycles: rows.length,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/payouts/schedule error:", error);
    return NextResponse.json(
      { error: error?.message || "Server error" },
      { status: 500 }
    );
  }
}