"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getToken } from "@/lib/client-auth";

export default function InvitePage() {
  const sp = useSearchParams();
  const router = useRouter();
  const token = sp.get("token") || "";
  const [msg, setMsg] = useState("Accepting invite...");
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      const jwt = getToken();
      if (!jwt) {
        setMsg("Please log in first. Then open this invite link again.");
        return;
      }

      try {
        const res = await fetch("/api/invites/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Failed");

        setMsg("Invite accepted! Redirecting to dashboard...");
        setTimeout(() => router.push("/dashboard"), 800);
      } catch (e: any) {
        setErr(e?.message || "Failed");
        setMsg("");
      }
    })();
  }, [router, token]);

  return (
    <main className="min-h-screen grid place-items-center bg-[#f0f2f5] p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm border">
        <h1 className="text-xl font-semibold text-slate-900">CircleSave Invite</h1>
        <p className="mt-2 text-sm text-slate-600">
          {msg || "There was a problem accepting this invite."}
        </p>
        {err && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        )}
        <p className="mt-4 text-xs text-slate-500">
          Tip: If you aren’t logged in, go to Login, then open invite again.
        </p>
      </div>
    </main>
  );
}
