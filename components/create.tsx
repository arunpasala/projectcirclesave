"use client";

import { useActionState } from "react";
import { createCircleAction } from "@/app/actions/circles";

const initialState = { ok: false as const, error: "" };

export default function CreateCircleForm() {
  const [state, formAction, pending] = useActionState(createCircleAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input name="name" placeholder="Circle name" className="border p-2 rounded w-full" />
      <input
        name="contribution_amount"
        type="number"
        step="0.01"
        placeholder="Contribution amount"
        className="border p-2 rounded w-full"
      />
      <button disabled={pending} className="bg-green-600 text-white px-4 py-2 rounded">
        {pending ? "Creating..." : "Create Circle"}
      </button>

      {"error" in state && state.error ? <p className="text-red-600">{state.error}</p> : null}
      {"message" in state && state.message ? <p className="text-green-600">{state.message}</p> : null}
    </form>
  );
}