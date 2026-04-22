"use client";

import { useState } from "react";

export default function JoinCircleForm({ circleId }: { circleId: number }) {
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const onJoin = async () => {
    try {
      setLoading(true);
      setErr("");
      setMsg("");

      const token = localStorage.getItem("token") || "";

      const res = await fetch("/api/circles/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          circle_id: circleId,
          accepted_terms: acceptedTerms,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to join circle");
      }

      setMsg(data?.message || "Join request sent successfully.");
    } catch (error: any) {
      setErr(error?.message || "Failed to join circle");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80"
      >
        <p className="font-semibold text-white">Circle Terms & Conditions</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-white/70">
          <li>You must contribute in every cycle until the circle ends.</li>
          <li>Missing a payment affects all other members.</li>
          <li>If you already received payout, you must still continue paying.</li>
          <li>Missed payments may result in restrictions from future circles.</li>
          <li>Your agreement and payment behavior may be recorded in audit logs.</li>
        </ul>
      </div>

      <label className="flex items-start gap-3 text-sm text-white/80">
        <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={(e) => setAcceptedTerms(e.target.checked)}
          className="mt-1"
        />
        <span>
          I have read and agree to the CircleSave Terms & Conditions.
        </span>
      </label>

      {err ? <p className="text-sm text-rose-300">{err}</p> : null}
      {msg ? <p className="text-sm text-emerald-300">{msg}</p> : null}

      <button
        onClick={onJoin}
        disabled={!acceptedTerms || loading}
        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {loading ? "Joining..." : "Join Circle"}
      </button>
    </div>
  );
}