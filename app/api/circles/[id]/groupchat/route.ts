import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabase/admin";
import { requireAuthUserId } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

function shortUserLabel(userId: string) {
  if (!userId) return "Unknown";
  return `${userId.slice(0, 6)}...${userId.slice(-4)}`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = requireAuthUserId(req);
    const { id } = await params;
    const circleId = Number(id);

    if (!Number.isInteger(circleId) || circleId <= 0) {
      return NextResponse.json({ error: "Invalid circle id" }, { status: 400 });
    }

    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("circle_members")
      .select("id")
      .eq("circle_id", circleId)
      .eq("user_auth_id", userId)
      .eq("status", "APPROVED")
      .maybeSingle();

    if (membershipError) {
      return NextResponse.json(
        { error: membershipError.message },
        { status: 500 }
      );
    }

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: messages, error: messagesError } = await supabaseAdmin
      .from("circle_messages")
      .select("id, circle_id, sender_auth_id, message, created_at, seen_by, delivered")
      .eq("circle_id", circleId)
      .order("created_at", { ascending: true });

    if (messagesError) {
      return NextResponse.json(
        { error: messagesError.message },
        { status: 500 }
      );
    }

    // NEW: fetch sender names from users table using auth_user_id
    const senderIds = [...new Set((messages ?? []).map((msg) => msg.sender_auth_id))];

    const { data: users, error: usersError } = await supabaseAdmin
      .from("users")
      .select("auth_user_id, full_name, email")
      .in("auth_user_id", senderIds);

    if (usersError) {
      return NextResponse.json(
        { error: usersError.message },
        { status: 500 }
      );
    }

    const userMap = new Map<string, string>();

    (users ?? []).forEach((user) => {
      userMap.set(
        user.auth_user_id,
        user.full_name?.trim() ||
          user.email?.split("@")[0] ||
          shortUserLabel(user.auth_user_id)
      );
    });

    const unseenFromOthers = (messages ?? []).filter(
      (msg) =>
        msg.sender_auth_id !== userId &&
        !((msg.seen_by ?? []) as string[]).includes(userId)
    );

    for (const msg of unseenFromOthers) {
      const updatedSeenBy = [...new Set([...(msg.seen_by ?? []), userId])];

      await supabaseAdmin
        .from("circle_messages")
        .update({ seen_by: updatedSeenBy })
        .eq("id", msg.id);
    }

    const refreshedMessages = (messages ?? []).map((msg) => {
      const seenBy =
        msg.sender_auth_id !== userId
          ? [...new Set([...(msg.seen_by ?? []), userId])]
          : (msg.seen_by ?? []);

      return {
        ...msg,
        // CHANGED: use full name from users table, fallback to short id
        sender_label:
          userMap.get(msg.sender_auth_id) || shortUserLabel(msg.sender_auth_id),
        seen_by: seenBy,
        delivered: msg.delivered ?? true,
      };
    });

    return NextResponse.json({ messages: refreshedMessages });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load group chat" },
      { status: error?.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = requireAuthUserId(req);
    const { id } = await params;
    const circleId = Number(id);

    if (!Number.isInteger(circleId) || circleId <= 0) {
      return NextResponse.json({ error: "Invalid circle id" }, { status: 400 });
    }

    const body = await req.json();
    const message = String(body?.message ?? "").trim();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    if (message.length > 1000) {
      return NextResponse.json(
        { error: "Message is too long" },
        { status: 400 }
      );
    }

    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("circle_members")
      .select("id")
      .eq("circle_id", circleId)
      .eq("user_auth_id", userId)
      .eq("status", "APPROVED")
      .maybeSingle();

    if (membershipError) {
      return NextResponse.json(
        { error: membershipError.message },
        { status: 500 }
      );
    }

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error: insertError } = await supabaseAdmin
      .from("circle_messages")
      .insert({
        circle_id: circleId,
        sender_auth_id: userId,
        message,
        delivered: true,
        seen_by: [userId],
      });

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to send message" },
      { status: error?.message === "Unauthorized" ? 401 : 500 }
    );
  }
}