"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

export async function createCircleAction(
  _: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { supabase, user } = await getCurrentUserOrThrow();

    const name = String(formData.get("name") || "").trim();
    const contributionAmount = Number(formData.get("contribution_amount") || 0);

    if (!name) {
      return { ok: false, error: "Circle name is required." };
    }

    if (!Number.isFinite(contributionAmount) || contributionAmount <= 0) {
      return { ok: false, error: "Contribution amount must be greater than 0." };
    }

    const { data: circle, error: circleError } = await supabase
      .from("circles")
      .insert({
        name,
        contribution_amount: contributionAmount,
        owner_auth_id: user.id,
      })
      .select("id, name")
      .single();

    if (circleError || !circle) {
      return { ok: false, error: circleError?.message || "Failed to create circle." };
    }

    const { error: memberError } = await supabase.from("circle_members").insert({
      circle_id: circle.id,
      user_auth_id: user.id,
      role: "OWNER",
      status: "APPROVED",
      joined_at: new Date().toISOString(),
      requested_at: new Date().toISOString(),
      decided_at: new Date().toISOString(),
      decided_by_auth_id: user.id,
    });

    if (memberError) {
      return { ok: false, error: memberError.message };
    }

    const { error: notifError } = await supabase.from("notifications").insert({
      user_auth_id: user.id,
      title: "Circle created",
      message: `Your circle "${circle.name}" has been created successfully.`,
      type: "SYSTEM",
    });

    if (notifError) {
      console.error("Notification insert failed:", notifError.message);
    }

    revalidatePath("/dashboard");
    revalidatePath("/circles");
    revalidatePath(`/circles/${circle.id}`);

    return { ok: true, message: "Circle created successfully." };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Something went wrong.",
    };
  }
}

export async function joinCircleAction(
  circleId: number
): Promise<ActionResult> {
  try {
    const { supabase, user } = await getCurrentUserOrThrow();

    if (!Number.isInteger(circleId) || circleId <= 0) {
      return { ok: false, error: "Invalid circle ID." };
    }

    const { data: existing, error: existingError } = await supabase
      .from("circle_members")
      .select("id, status")
      .eq("circle_id", circleId)
      .eq("user_auth_id", user.id)
      .maybeSingle();

    if (existingError) {
      return { ok: false, error: existingError.message };
    }

    if (existing) {
      if (existing.status === "APPROVED") {
        return { ok: false, error: "You are already a member of this circle." };
      }
      if (existing.status === "PENDING") {
        return { ok: false, error: "Your join request is already pending." };
      }

      const { error: updateError } = await supabase
        .from("circle_members")
        .update({
          status: "PENDING",
          requested_at: new Date().toISOString(),
          decided_at: null,
          decided_by_auth_id: null,
        })
        .eq("id", existing.id);

      if (updateError) {
        return { ok: false, error: updateError.message };
      }
    } else {
      const { error: insertError } = await supabase.from("circle_members").insert({
        circle_id: circleId,
        user_auth_id: user.id,
        role: "MEMBER",
        status: "PENDING",
        requested_at: new Date().toISOString(),
      });

      if (insertError) {
        return { ok: false, error: insertError.message };
      }
    }

    revalidatePath("/dashboard");
    revalidatePath("/circles");
    revalidatePath(`/circles/${circleId}`);

    return { ok: true, message: "Join request submitted." };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Something went wrong.",
    };
  }
}

export async function leaveCircleAction(
  circleId: number
): Promise<ActionResult> {
  try {
    const { supabase, user } = await getCurrentUserOrThrow();

    const { data: membership, error: membershipError } = await supabase
      .from("circle_members")
      .select("id, role, status")
      .eq("circle_id", circleId)
      .eq("user_auth_id", user.id)
      .maybeSingle();

    if (membershipError) {
      return { ok: false, error: membershipError.message };
    }

    if (!membership) {
      return { ok: false, error: "Membership not found." };
    }

    if (membership.role === "OWNER") {
      return { ok: false, error: "Owner cannot leave the circle directly." };
    }

    const { error: updateError } = await supabase
      .from("circle_members")
      .update({
        status: "LEFT",
        decided_at: new Date().toISOString(),
        decided_by_auth_id: user.id,
      })
      .eq("id", membership.id);

    if (updateError) {
      return { ok: false, error: updateError.message };
    }

    revalidatePath("/dashboard");
    revalidatePath("/circles");
    revalidatePath(`/circles/${circleId}`);

    return { ok: true, message: "You left the circle." };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Something went wrong.",
    };
  }
}

export async function deleteCircleAction(
  circleId: number
): Promise<ActionResult> {
  try {
    const { supabase, user } = await getCurrentUserOrThrow();

    const { data: circle, error: circleError } = await supabase
      .from("circles")
      .select("id, owner_auth_id, name")
      .eq("id", circleId)
      .maybeSingle();

    if (circleError) {
      return { ok: false, error: circleError.message };
    }

    if (!circle) {
      return { ok: false, error: "Circle not found." };
    }

    if (circle.owner_auth_id !== user.id) {
      return { ok: false, error: "Only the owner can delete this circle." };
    }

    const { error: deleteError } = await supabase
      .from("circles")
      .delete()
      .eq("id", circleId);

    if (deleteError) {
      return { ok: false, error: deleteError.message };
    }

    revalidatePath("/dashboard");
    revalidatePath("/circles");

    return { ok: true, message: "Circle deleted successfully." };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Something went wrong.",
    };
  }
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}