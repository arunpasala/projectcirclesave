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
      .select("id, name, owner_auth_id")
      .eq("id", circleId)
      .single();

    if (circleError || !circle) {
      return NextResponse.json({ error: "Circle not found" }, { status: 404 });
    }

    if (circle.owner_auth_id !== authUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: requestRows, error: requestsError } = await supabaseAdmin
      .from("circle_members")
      .select(
        "id, circle_id, user_auth_id, role, status, requested_at, joined_at, decided_at"
      )
      .eq("circle_id", circleId)
      .eq("status", "PENDING")
      .order("requested_at", { ascending: true });

    if (requestsError) {
      return NextResponse.json({ error: requestsError.message }, { status: 500 });
    }

    const requesterIds = [...new Set((requestRows ?? []).map((r) => r.user_auth_id))];

    let profiles: Array<{
      id: string;
      email: string | null;
      full_name: string | null;
    }> = [];

    if (requesterIds.length > 0) {
      const { data: profileRows, error: profilesError } = await supabaseAdmin
        .from("profiles")
        .select("id, email, full_name")
        .in("id", requesterIds);

      if (profilesError) {
        return NextResponse.json({ error: profilesError.message }, { status: 500 });
      }

      profiles = profileRows ?? [];
    }

    const requests = (requestRows ?? []).map((request) => {
      const profile = profiles.find((p) => p.id === request.user_auth_id);

      return {
        ...request,
        circle_name: circle.name,
        requester: profile ?? null,
      };
    });

    return NextResponse.json({ requests });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch requests.",
      },
      { status: 401 }
    );
  }
}