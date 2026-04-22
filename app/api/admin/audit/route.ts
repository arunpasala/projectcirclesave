import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabase/admin";
import { requireAuthUserId } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

type UserRow = {
  auth_user_id: string;
  full_name: string | null;
  email: string | null;
};

export async function GET(req: NextRequest) {
  try {
    const authUserId = requireAuthUserId(req);

    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "";
    const actionType = url.searchParams.get("action_type") || "";
    const circleId = url.searchParams.get("circle_id") || "";
    const limit = Math.min(Number(url.searchParams.get("limit") || "100"), 200);

    // Check current user role
    const { data: currentUser, error: currentUserError } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (currentUserError) {
      return NextResponse.json(
        { error: currentUserError.message },
        { status: 500 }
      );
    }

    if (!currentUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const isAdmin = currentUser.role === "admin";

    // Non-admin users must be owner of the requested circle
    if (!isAdmin) {
      if (!circleId) {
        return NextResponse.json(
          { error: "circle_id is required for non-admin users" },
          { status: 400 }
        );
      }

      const { data: circle, error: circleError } = await supabaseAdmin
        .from("circles")
        .select("id, owner_auth_id")
        .eq("id", Number(circleId))
        .maybeSingle();

      if (circleError) {
        return NextResponse.json(
          { error: circleError.message },
          { status: 500 }
        );
      }

      if (!circle || circle.owner_auth_id !== authUserId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    let query = supabaseAdmin
      .from("audit_logs")
      .select(
        "id, actor_user_id, action_type, circle_id, target_id, metadata, created_at, action, status, ip_address, user_agent"
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) query = query.eq("status", status);
    if (actionType) query = query.eq("action_type", actionType);
    if (circleId) query = query.eq("circle_id", Number(circleId));

    const { data: logs, error: logsError } = await query;

    if (logsError) {
      return NextResponse.json({ error: logsError.message }, { status: 500 });
    }

    const actorIds = [
      ...new Set((logs ?? []).map((row) => row.actor_user_id).filter(Boolean)),
    ] as string[];

    const usersMap = new Map<string, string>();

    if (actorIds.length > 0) {
      const { data: users, error: usersError } = await supabaseAdmin
        .from("users")
        .select("auth_user_id, full_name, email")
        .in("auth_user_id", actorIds);

      if (usersError) {
        return NextResponse.json(
          { error: usersError.message },
          { status: 500 }
        );
      }

      (users as UserRow[] | null)?.forEach((user) => {
        usersMap.set(
          user.auth_user_id,
          user.full_name?.trim() ||
            user.email?.trim() ||
            user.auth_user_id.slice(0, 6)
        );
      });
    }

    const enrichedLogs = (logs ?? []).map((row) => ({
      ...row,
      actor_name:
        (row.actor_user_id && usersMap.get(row.actor_user_id)) ||
        (row.actor_user_id ? row.actor_user_id.slice(0, 6) : "Unknown"),
    }));

    const totalLogs = enrichedLogs.length;
    const failedLogs = enrichedLogs.filter((row) => row.status === "FAILED").length;

    const suspiciousUsers = Object.values(
      enrichedLogs.reduce<Record<string, { actor: string; count: number }>>(
        (acc, row) => {
          if (!row.actor_user_id) return acc;

          if (!acc[row.actor_user_id]) {
            acc[row.actor_user_id] = {
              actor: row.actor_name,
              count: 0,
            };
          }

          acc[row.actor_user_id].count += 1;
          return acc;
        },
        {}
      )
    )
      .filter((entry) => entry.count >= 5)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const actionTypes = [
      ...new Set(enrichedLogs.map((row) => row.action_type).filter(Boolean)),
    ] as string[];

    const circleIds = [
      ...new Set(enrichedLogs.map((row) => row.circle_id).filter(Boolean)),
    ] as number[];

    return NextResponse.json({
      logs: enrichedLogs,
      summary: {
        total_logs: totalLogs,
        failed_logs: failedLogs,
        suspicious_users_count: suspiciousUsers.length,
      },
      suspicious_users: suspiciousUsers,
      filters: {
        action_types: actionTypes,
        circle_ids: circleIds,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load audit logs" },
      { status: error?.message === "Unauthorized" ? 401 : 500 }
    );
  }
}