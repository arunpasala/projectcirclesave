import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // circles owned by current user
    const { data: ownedCircles, error: ownedError } = await supabase
      .from("circles")
      .select("id, name")
      .eq("owner_auth_id", user.id);

    if (ownedError) {
      return NextResponse.json({ error: ownedError.message }, { status: 500 });
    }

    const ownedCircleIds = (ownedCircles ?? []).map((c) => c.id);

    // admin requests for circles I own
    let requests: any[] = [];
    if (ownedCircleIds.length > 0) {
      const { data: requestRows, error: requestsError } = await supabase
        .from("circle_members")
        .select(
          "id, circle_id, user_auth_id, role, status, requested_at, joined_at, decided_at"
        )
        .in("circle_id", ownedCircleIds)
        .eq("status", "PENDING")
        .order("requested_at", { ascending: false });

      if (requestsError) {
        return NextResponse.json({ error: requestsError.message }, { status: 500 });
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
      const { data: profileRows, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", requesterIds);

      if (profilesError) {
        return NextResponse.json({ error: profilesError.message }, { status: 500 });
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

    // my pending requests
    const { data: pendingMine, error: pendingMineError } = await supabase
      .from("circle_members")
      .select("id, circle_id, user_auth_id, role, status, requested_at")
      .eq("user_auth_id", user.id)
      .eq("status", "PENDING")
      .order("requested_at", { ascending: false });

    if (pendingMineError) {
      return NextResponse.json({ error: pendingMineError.message }, { status: 500 });
    }

    const pendingCircleIds = (pendingMine ?? []).map((p) => p.circle_id);

    let pendingCircles: Array<{ id: number; name: string }> = [];
    if (pendingCircleIds.length > 0) {
      const { data: pendingCircleRows, error: pendingCirclesError } = await supabase
        .from("circles")
        .select("id, name")
        .in("id", pendingCircleIds);

      if (pendingCirclesError) {
        return NextResponse.json({ error: pendingCirclesError.message }, { status: 500 });
      }

      pendingCircles = pendingCircleRows ?? [];
    }

    const enrichedPendingMine = (pendingMine ?? []).map((item) => ({
      ...item,
      circle_name: pendingCircles.find((c) => c.id === item.circle_id)?.name ?? null,
    }));

    return NextResponse.json({
      requests: enrichedRequests,
      pendingMine: enrichedPendingMine,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch requests.",
      },
      { status: 500 }
    );
  }
}