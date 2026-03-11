import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/circles/requests — pending join requests for circles owned by the current user
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get circles owned by this user
    const { data: ownedCircles, error: ownedError } = await supabase
      .from("circles")
      .select("id")
      .eq("owner_id", user.id);

    if (ownedError) {
      return NextResponse.json({ error: ownedError.message }, { status: 500 });
    }

    if (!ownedCircles || ownedCircles.length === 0) {
      return NextResponse.json({ requests: [] });
    }

    const circleIds = ownedCircles.map((c: any) => c.id);

    // Get pending join requests for those circles, with requester info
    const { data, error } = await supabase
      .from("circle_members")
      .select(`
        id,
        circle_id,
        user_id,
        status,
        created_at,
        circles ( name ),
        profiles ( email, full_name )
      `)
      .in("circle_id", circleIds)
      .eq("status", "PENDING")
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const requests = (data || []).map((row: any) => ({
      request_id: row.id,
      circle_id: row.circle_id,
      circle_name: row.circles?.name || "",
      requester_id: row.user_id,
      requester_email: row.profiles?.email || "",
      requester_name: row.profiles?.full_name || "",
      requested_at: row.created_at,
      status: row.status,
    }));

    return NextResponse.json({ requests });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}