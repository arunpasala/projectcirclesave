import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabase/admin";
import { requireAuthUserId } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authUserId = requireAuthUserId(req);
    const { id } = await context.params;
    const circleId = Number(id);

    if (!Number.isFinite(circleId)) {
      return NextResponse.json({ error: "Invalid circle id" }, { status: 400 });
    }

    const { data: circle, error: circleError } = await supabaseAdmin
      .from("circles")
      .select("id, owner_auth_id")
      .eq("id", circleId)
      .single();

    if (circleError || !circle) {
      return NextResponse.json({ error: "Circle not found" }, { status: 404 });
    }

    const isOwner = circle.owner_auth_id === authUserId;

    const { data: membersRaw, error: membersError } = await supabaseAdmin
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
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch members.",
      },
      { status: 401 }
    );
  }
}