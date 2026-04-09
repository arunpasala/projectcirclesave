"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createCircle } from "@/lib/api/circles";
import {
  DashboardShell,
  Section,
  GlassCard,
  Badge,
} from "@/components/ui/dashboard-shell";

function cls(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

type JwtPayload = {
  userId: string;
  authUserId?: string;
  email?: string;
  role?: string;
  exp?: number;
};

function parseJwt(token: string): JwtPayload | null {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => `%${("00" + c.charCodeAt(0).toString(16)).slice(-2)}`)
        .join("")
    );

    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export default function CreateCirclePage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [contributionAmount, setContributionAmount] = useState("");
  const [description, setDescription] = useState("");
  const [maxMembers, setMaxMembers] = useState("10");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setBusy(true);
      setErr("");
      setMsg("");

      const token = localStorage.getItem("token");

      if (!token) {
        router.replace("/auth/login");
        return;
      }

      const payload = parseJwt(token);

      if (!payload?.userId) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.replace("/auth/login");
        return;
      }

      if (!name.trim()) {
        throw new Error("Circle name is required.");
      }

      const amount = Number(contributionAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Contribution amount must be greater than 0.");
      }

      const res = await createCircle({
        name: name.trim(),
        contribution_amount: amount,
      });

      setMsg(`Circle "${res.circle.name}" created successfully.`);

      setTimeout(() => {
        router.push(`/dashboard/circles/${res.circle.id}`);
      }, 800);
    } catch (e: any) {
      setErr(e?.message || "Failed to create circle.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardShell
      title="Create a Circle"
      subtitle="Set up a new savings circle with the same CircleSave dashboard style"
      userLabel="Arun"
      actions={
        <Link
          href="/dashboard"
          className="rounded-xl px-3 py-2 text-xs font-semibold"
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.15)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            color: "rgba(255,255,255,0.8)",
          }}
        >
          ← Dashboard
        </Link>
      }
    >
      <div className="mb-4">
        <Badge color="emerald">New Savings Circle</Badge>
      </div>

      {err ? (
        <div
          className="mb-4 rounded-2xl px-4 py-3 text-sm"
          style={{
            background: "rgba(244,63,94,0.12)",
            border: "1px solid rgba(244,63,94,0.3)",
            backdropFilter: "blur(12px)",
            color: "#fda4af",
          }}
        >
          ⚠ {err}
        </div>
      ) : null}

      {msg ? (
        <div
          className="mb-4 rounded-2xl px-4 py-3 text-sm"
          style={{
            background: "rgba(16,185,129,0.12)",
            border: "1px solid rgba(16,185,129,0.3)",
            backdropFilter: "blur(12px)",
            color: "#6ee7b7",
          }}
        >
          ✓ {msg}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <Section
          title="Circle Details"
          subtitle="Define the basic structure of your savings circle"
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-white">
                Circle Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Example: Family Savings Circle"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white">
                Contribution Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={contributionAmount}
                onChange={(e) => setContributionAmount(e.target.value)}
                placeholder="100"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional notes about this circle..."
                rows={4}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white">
                Max Members
              </label>
              <input
                type="number"
                value={maxMembers}
                onChange={(e) => setMaxMembers(e.target.value)}
                placeholder="10"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
              />
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={busy}
                className={cls(
                  "rounded-2xl px-5 py-3 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                )}
                style={{
                  background: "rgba(16,185,129,0.85)",
                  border: "1px solid rgba(16,185,129,0.4)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                }}
              >
                {busy ? "Creating..." : "Create Circle"}
              </button>

              <Link
                href="/dashboard"
                className="rounded-2xl px-5 py-3 text-sm font-bold"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  color: "rgba(255,255,255,0.85)",
                }}
              >
                Cancel
              </Link>
            </div>
          </form>
        </Section>

        <div className="space-y-4">
          <GlassCard>
            <h3 className="text-sm font-bold text-white">Preview</h3>
            <div
              className="mt-4 rounded-2xl p-4"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <p className="text-sm font-semibold text-white">
                {name.trim() || "Your circle name"}
              </p>
              <p className="mt-1 text-xs text-white/50">
                ${contributionAmount || "0"}/month
              </p>
              <div className="mt-3">
                <Badge color="emerald">Owner</Badge>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <h3 className="text-sm font-bold text-white">Tips</h3>
            <ul className="mt-3 space-y-2 text-sm text-white/65">
              <li>• Keep the name simple and recognizable.</li>
              <li>• Set a realistic monthly contribution.</li>
              <li>• Approve only trusted members.</li>
              <li>• Use payouts and contributions consistently each cycle.</li>
            </ul>
          </GlassCard>
        </div>
      </div>
    </DashboardShell>
  );
}