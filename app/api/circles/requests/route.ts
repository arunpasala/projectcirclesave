import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabase/admin";
import { requireAuthUserId } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authUserId = requireAuthUserId(req);

    const { data: ownedCircles, error: ownedError } = await supabaseAdmin
      .from("circles")
      .select("id, name")
      .eq("owner_auth_id", authUserId);

    if (ownedError) {
      return NextResponse.json({ error: ownedError.message }, { status: 500 });
    }

    const ownedCircleIds = (ownedCircles ?? []).map((c) => c.id);

    let requests: any[] = [];
    if (ownedCircleIds.length > 0) {
      const { data: requestRows, error: requestsError } = await supabaseAdmin
        .from("circle_members")
        .select(
          "id, circle_id, user_auth_id, role, status, requested_at, joined_at, decided_at"
        )
        .in("circle_id", ownedCircleIds)
        .eq("status", "PENDING")
        .order("requested_at", { ascending: false });

      if (requestsError) {
        return NextResponse.json(
          { error: requestsError.message },
          { status: 500 }
        );
      }

      requests = requestRows ?? [];
    }

    const requesterIds = [...new Set(requests.map((r) => r.user_auth_id))];

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
        return NextResponse.json(
          { error: profilesError.message },
          { status: 500 }
        );
      }

      profiles = profileRows ?? [];
    }

    const enrichedRequests = requests.map((request) => {
      const circle = ownedCircles?.find((c) => c.id === request.circle_id);
      const profile = profiles.find((p) => p.id === request.user_auth_id);

      return {
        ...request,
        circle_name: circle?.name ?? null,
        requester: profile ?? null,
      };
    });

    const { data: pendingMine, error: pendingMineError } = await supabaseAdmin
      .from("circle_members")
      .select("id, circle_id, user_auth_id, role, status, requested_at")
      .eq("user_auth_id", authUserId)
      .eq("status", "PENDING")
      .order("requested_at", { ascending: false });

    if (pendingMineError) {
      return NextResponse.json(
        { error: pendingMineError.message },
        { status: 500 }
      );
    }

    const pendingCircleIds = (pendingMine ?? []).map((p) => p.circle_id);

    let pendingCircles: Array<{ id: number; name: string }> = [];
    if (pendingCircleIds.length > 0) {
      const { data: pendingCircleRows, error: pendingCirclesError } =
        await supabaseAdmin
          .from("circles")
          .select("id, name")
          .in("id", pendingCircleIds);

      if (pendingCirclesError) {
        return NextResponse.json(
          { error: pendingCirclesError.message },
          { status: 500 }
        );
      }

      pendingCircles = pendingCircleRows ?? [];
    }

    const enrichedPendingMine = (pendingMine ?? []).map((item) => ({
      ...item,
      circle_name:
        pendingCircles.find((c) => c.id === item.circle_id)?.name ?? null,
    }));

    return NextResponse.json({
      requests: enrichedRequests,
      pendingMine: enrichedPendingMine,
    });
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