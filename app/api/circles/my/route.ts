import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get all circle_ids where user is APPROVED
  const { data: memberships, error: memberError } = await supabase
    .from("circle_members")
    .select("circle_id")
    .eq("user_id", user.id)
    .eq("status", "APPROVED");

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  const memberCircleIds = memberships?.map((m) => m.circle_id) ?? [];

  // Get circles user OWNS
  const { data: ownedCircles, error: ownedError } = await supabase
    .from("circles")
    .select(`
      id, name, description, contribution_amount,
      cycle_length_months, max_members, status, created_at, owner_id
    `)
    .eq("owner_id", user.id);

  if (ownedError) {
    return NextResponse.json({ error: ownedError.message }, { status: 500 });
  }

  // Get circles user is an APPROVED member of (excluding ones they own)
  const ownedIds = ownedCircles?.map((c) => c.id) ?? [];
  const memberOnlyIds = memberCircleIds.filter((id) => !ownedIds.includes(id));

  let memberCircles: typeof ownedCircles = [];
  if (memberOnlyIds.length > 0) {
    const { data, error: memberCirclesError } = await supabase
      .from("circles")
      .select(`
        id, name, description, contribution_amount,
        cycle_length_months, max_members, status, created_at, owner_id
      `)
      .in("id", memberOnlyIds);

    if (memberCirclesError) {
      return NextResponse.json({ error: memberCirclesError.message }, { status: 500 });
    }

    memberCircles = data ?? [];
  }

  // Get member counts for all circles
  const allCircleIds = [
    ...(ownedCircles?.map((c) => c.id) ?? []),
    ...memberOnlyIds,
  ];

  let memberCounts: Record<number, number> = {};
  if (allCircleIds.length > 0) {
    const { data: counts } = await supabase
      .from("circle_members")
      .select("circle_id")
      .in("circle_id", allCircleIds)
      .eq("status", "APPROVED");

    memberCounts = (counts ?? []).reduce((acc, row) => {
      acc[row.circle_id] = (acc[row.circle_id] ?? 0) + 1;
      return acc;
    }, {} as Record<number, number>);
  }

  const format = (circles: typeof ownedCircles, role: "owner" | "member") =>
    (circles ?? []).map((c) => ({
      ...c,
      role,
      member_count: memberCounts[c.id] ?? 0,
    }));

  return NextResponse.json({
    owned: format(ownedCircles, "owner"),
    member: format(memberCircles, "member"),
  });
}