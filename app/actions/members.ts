"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

async function getCurrentUserOrThrow() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("You must be signed in.");
  }

  return { supabase, user };
}

async function ensureOwner(
  circleId: number,
  userId: string
) {
  const supabase = await createClient();

  const { data: circle, error } = await supabase
    .from("circles")
    .select("id, owner_auth_id, name")
    .eq("id", circleId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!circle) throw new Error("Circle not found.");
  if (circle.owner_auth_id !== userId) {
    throw new Error("Only the owner can manage members.");
  }

  return { supabase, circle };
}

export async function approveMemberAction(
  circleId: number,
  memberUserId: string
): Promise<ActionResult> {
  try {
    const { user } = await getCurrentUserOrThrow();
    const { supabase, circle } = await ensureOwner(circleId, user.id);

    const { data: membership, error: membershipError } = await supabase
      .from("circle_members")
      .select("id, status")
      .eq("circle_id", circleId)
      .eq("user_auth_id", memberUserId)
      .maybeSingle();

    if (membershipError) {
      return { ok: false, error: membershipError.message };
    }

    if (!membership) {
      return { ok: false, error: "Membership request not found." };
    }

    const { error: updateError } = await supabase
      .from("circle_members")
      .update({
        status: "APPROVED",
        joined_at: new Date().toISOString(),
        decided_at: new Date().toISOString(),
        decided_by_auth_id: user.id,
      })
      .eq("id", membership.id);

    if (updateError) {
      return { ok: false, error: updateError.message };
    }

    await supabase.from("notifications").insert({
      user_auth_id: memberUserId,
      title: "Join request approved",
      message: `Your request to join "${circle.name}" has been approved.`,
      type: "JOIN_APPROVED",
    });

    revalidatePath("/dashboard");
    revalidatePath(`/circles/${circleId}`);

    return { ok: true, message: "Member approved." };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Something went wrong.",
    };
  }
}

export async function rejectMemberAction(
  circleId: number,
  memberUserId: string
): Promise<ActionResult> {
  try {
    const { user } = await getCurrentUserOrThrow();
    const { supabase, circle } = await ensureOwner(circleId, user.id);

    const { data: membership, error: membershipError } = await supabase
      .from("circle_members")
      .select("id")
      .eq("circle_id", circleId)
      .eq("user_auth_id", memberUserId)
      .maybeSingle();

    if (membershipError) {
      return { ok: false, error: membershipError.message };
    }

    if (!membership) {
      return { ok: false, error: "Membership request not found." };
    }

    const { error: updateError } = await supabase
      .from("circle_members")
      .update({
        status: "REJECTED",
        decided_at: new Date().toISOString(),
        decided_by_auth_id: user.id,
      })
      .eq("id", membership.id);

    if (updateError) {
      return { ok: false, error: updateError.message };
    }

    await supabase.from("notifications").insert({
      user_auth_id: memberUserId,
      title: "Join request rejected",
      message: `Your request to join "${circle.name}" was rejected.`,
      type: "JOIN_REJECTED",
    });

    revalidatePath("/dashboard");
    revalidatePath(`/circles/${circleId}`);

    return { ok: true, message: "Member rejected." };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Something went wrong.",
    };
  }
}

export async function removeMemberAction(
  circleId: number,
  memberUserId: string
): Promise<ActionResult> {
  try {
    const { user } = await getCurrentUserOrThrow();
    const { supabase, circle } = await ensureOwner(circleId, user.id);

    if (memberUserId === user.id) {
      return { ok: false, error: "Owner cannot remove themselves." };
    }

    const { error } = await supabase
      .from("circle_members")
      .delete()
      .eq("circle_id", circleId)
      .eq("user_auth_id", memberUserId);

    if (error) {
      return { ok: false, error: error.message };
    }

    await supabase.from("notifications").insert({
      user_auth_id: memberUserId,
      title: "Removed from circle",
      message: `You were removed from "${circle.name}".`,
      type: "MEMBER_REMOVED",
    });

    revalidatePath("/dashboard");
    revalidatePath(`/circles/${circleId}`);

    return { ok: true, message: "Member removed." };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Something went wrong.",
    };
  }
}