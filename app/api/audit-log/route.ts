import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type AuditLogBody = {
  action: string;
  status: "success" | "error";
  metadata?: Record<string, unknown>;
  circle_id?: number | null;
  target_id?: number | null;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AuditLogBody;

    if (!body.action || !body.status) {
      return NextResponse.json(
        { error: "action and status are required" },
        { status: 400 }
      );
    }

    const authHeader = req.headers.get("authorization");
    let actorUserId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "").trim();

      if (token) {
        const {
          data: { user },
          error: userError,
        } = await supabaseAdmin.auth.getUser(token);

        if (!userError && user) {
          actorUserId = user.id;
        }
      }
    }

    const forwardedFor = req.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() || null;
    const userAgent = req.headers.get("user-agent") || null;

    const payload = {
      actor_user_id: actorUserId,
      action: body.action,
      action_type: body.action,
      status: body.status,
      circle_id: body.circle_id ?? null,
      target_id: body.target_id ?? null,
      ip_address: ipAddress,
      user_agent: userAgent,
      metadata: body.metadata ?? {},
    };

    const { error } = await supabaseAdmin.from("audit_logs").insert(payload);

    if (error) {
      console.error("AUDIT_LOG_INSERT_ERROR:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("AUDIT_LOG_ROUTE_ERROR:", error);
    return NextResponse.json(
      { error: "Invalid audit log request" },
      { status: 400 }
    );
  }
}