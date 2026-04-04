import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import jwt, { JwtPayload } from "jsonwebtoken";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type AppJwtPayload = JwtPayload & {
  userId: string;
  authUserId?: string;
  email?: string;
  role?: string;
};

function requireAuth(req: Request): AppJwtPayload {
  const auth = req.headers.get("authorization");

  if (!auth || !auth.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  const token = auth.split(" ")[1];

  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET missing");
  }

  return jwt.verify(token, process.env.JWT_SECRET) as AppJwtPayload;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const decoded = requireAuth(req);
    const currentAuthUserId = decoded.authUserId || decoded.userId;

    const { id } = await context.params;
    const circleId = Number(id);

    if (!circleId || Number.isNaN(circleId)) {
      return NextResponse.json({ error: "Invalid circle id" }, { status: 400 });
    }

    const { data: circleRaw, error: circleError } = await supabase
      .from("circles")
      .select("*")
      .eq("id", circleId)
      .single();

    if (circleError || !circleRaw) {
      return NextResponse.json({ error: "Circle not found" }, { status: 404 });
    }

    const circle = {
      ...circleRaw,
      isOwner: circleRaw.owner_auth_id === currentAuthUserId,
    };

    const { data: membersRaw, error: membersError } = await supabase
      .from("circle_members")
      .select(`
        id,
        circle_id,
        user_auth_id,
        role,
        status,
        joined_at,
        profiles:profiles!circle_members_user_auth_id_fkey (
          id,
          full_name,
          email
        )
      `)
      .eq("circle_id", circleId)
      .order("joined_at", { ascending: true });

    if (membersError) {
      return NextResponse.json({ error: membersError.message }, { status: 500 });
    }

    const members =
      membersRaw?.map((m: any) => ({
        id: m.id,
        circle_id: m.circle_id,
        user_auth_id: m.user_auth_id,
        role: m.role,
        status: m.status,
        joined_at: m.joined_at,
        name: m.profiles?.full_name || "No Name",
        email: m.profiles?.email || "",
      })) || [];

    const { data: contributions, error: contributionsError } = await supabase
      .from("contributions")
      .select("*")
      .eq("circle_id", circleId)
      .order("cycle_no", { ascending: true });

    if (contributionsError) {
      return NextResponse.json(
        { error: contributionsError.message },
        { status: 500 }
      );
    }

    const { data: payoutRaw, error: payoutError } = await supabase
      .from("payout_schedule")
      .select(`
        id,
        circle_id,
        cycle_no,
        recipient_user_id,
        schedule_position,
        status,
        created_at,
        profiles:profiles!payout_schedule_recipient_user_id_fkey (
          full_name,
          email
        )
      `)
      .eq("circle_id", circleId)
      .order("cycle_no", { ascending: true });

    if (payoutError) {
      return NextResponse.json({ error: payoutError.message }, { status: 500 });
    }

    const payoutSchedule =
      payoutRaw?.map((p: any) => ({
        id: p.id,
        circle_id: p.circle_id,
        cycle_no: p.cycle_no,
        recipient_user_id: p.recipient_user_id,
        schedule_position: p.schedule_position,
        status: p.status,
        created_at: p.created_at,
        recipient_name: p.profiles?.full_name || "No Name",
        recipient_email: p.profiles?.email || "",
      })) || [];

    const { data: cycles, error: cyclesError } = await supabase
      .from("circle_cycles")
      .select("*")
      .eq("circle_id", circleId)
      .order("id", { ascending: false });

    if (cyclesError) {
      return NextResponse.json({ error: cyclesError.message }, { status: 500 });
    }

    const { data: cyclePayments, error: cyclePaymentsError } = await supabase
      .from("cycle_payments")
      .select("*")
      .eq("circle_id", circleId)
      .order("id", { ascending: false });

    if (cyclePaymentsError) {
      return NextResponse.json(
        { error: cyclePaymentsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      circle,
      members,
      contributions: contributions || [],
      payoutSchedule,
      cycles: cycles || [],
      cyclePayments: cyclePayments || [],
    });
  } catch (error: any) {
    console.error("GET /api/circles/[id] error:", error);
    return NextResponse.json(
      { error: error.message || "Server error" },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}