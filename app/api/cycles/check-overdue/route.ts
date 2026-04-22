import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabase/admin";
import { requireAuthUserId } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const authUserId = requireAuthUserId(req);

    // Only admin can run global overdue check
    const { data: currentUser, error: currentUserError } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (currentUserError) {
      return NextResponse.json({ error: currentUserError.message }, { status: 500 });
    }

    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date().toISOString();

    const { data: overdueRows, error: overdueError } = await supabaseAdmin
      .from("cycle_payments")
      .select("id, payer_user_id, circle_id, due_date, payment_status, is_overdue")
      .lt("due_date", now)
      .eq("payment_status", "PENDING")
      .eq("is_overdue", false);

    if (overdueError) {
      return NextResponse.json({ error: overdueError.message }, { status: 500 });
    }

    const rows = overdueRows ?? [];

    for (const row of rows) {
      await supabaseAdmin
        .from("cycle_payments")
        .update({ is_overdue: true })
        .eq("id", row.id);

      await supabaseAdmin
        .from("users")
        .update({
          is_restricted: true,
          restriction_reason: "Restricted due to overdue unpaid circle contribution.",
        })
        .eq("auth_user_id", row.payer_user_id);

      await supabaseAdmin.from("audit_logs").insert({
        actor_user_id: row.payer_user_id,
        action_type: "PAYMENT_MARKED_OVERDUE",
        circle_id: row.circle_id,
        status: "FAILED",
        metadata: {
          payment_id: row.id,
          due_date: row.due_date,
        },
      });
    }

    return NextResponse.json({
      message: "Overdue payment check completed.",
      affected_count: rows.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to check overdue payments" },
      { status: error?.message === "Unauthorized" ? 401 : 500 }
    );
  }
}