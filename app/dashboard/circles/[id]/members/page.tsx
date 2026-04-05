import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import jwt, { JwtPayload } from "jsonwebtoken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    const { data: circle, error: circleError } = await supabase
      .from("circles")
      .select("id, owner_auth_id")
      .eq("id", circleId)
      .single();

    if (circleError || !circle) {
      return NextResponse.json({ error: "Circle not found" }, { status: 404 });
    }

    const isOwner = circle.owner_auth_id === currentAuthUserId;

    const { data: membersRaw, error: membersError } = await supabase
      .from("circle_members")
      .select(`
        id,
        circle_id,
        user_auth_id,
        role,
        status,
        requested_at,
        joined_at,
        decided_at,
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

    const allMembers =
      membersRaw?.map((m: any) => ({
        id: m.id,
        circle_id: m.circle_id,
        user_auth_id: m.user_auth_id,
        role: m.role,
        status: m.status,
        requested_at: m.requested_at,
        joined_at: m.joined_at,
        decided_at: m.decided_at,
        profile: {
          id: m.profiles?.id ?? m.user_auth_id,
          full_name: m.profiles?.full_name ?? "No Name",
          email: m.profiles?.email ?? "",
        },
        name: m.profiles?.full_name ?? "No Name",
        email: m.profiles?.email ?? "",
      })) || [];

    const members = isOwner
      ? allMembers
      : allMembers.filter((m: any) => m.status === "APPROVED");

    return NextResponse.json({
      isOwner,
      members,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Unauthorized" },
      { status: e.message === "Unauthorized" ? 401 : 500 }
    );
  }
}