"use client";

import { useTransition } from "react";
import { joinCircleAction } from "@/app/actions/circles";

export function JoinCircleButton({ circleId }: { circleId: number }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          const res = await joinCircleAction(circleId);
          if (res.ok === true) {
  alert(res.message ?? "Request completed successfully.");
} else {
  alert("error" in res ? (res.error ?? "Request failed.") : "Request failed.");
}
          
          
        })
      }
      disabled={pending}
      className="bg-blue-600 text-white px-4 py-2 rounded"
    >
      {pending ? "Joining..." : "Join"}
    </button>
  );
}