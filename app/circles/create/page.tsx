"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createCircle } from "@/lib/api/circles";

function cls(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function CreateCirclePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

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

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
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
        router.push(`/circles/${res.circle.id}`);
      }, 800);
    } catch (e: any) {
      setErr(e?.message || "Failed to create circle.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <nav className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              ← Dashboard
            </Link>

            <div className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-600 text-sm font-black text-white">
              C
            </div>

            <span className="font-bold">CircleSave</span>
          </div>
        </div>
      </nav>

      <div className="pointer-events-none fixed inset-x-0 top-0 h-96 bg-gradient-to-b from-emerald-50/60 via-slate-50 to-transparent" />

      <div className="relative mx-auto max-w-4xl px-4 py-10">
        <div className="mb-6">
          <div className="mb-2 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
            New Savings Circle
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Create a Circle</h1>
          <p className="mt-1 text-sm text-slate-500">
            Set up a new savings circle with the same clean CircleSave style.
          </p>
        </div>

        {err ? (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            ⚠ {err}
          </div>
        ) : null}

        {msg ? (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            ✓ {msg}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-slate-900">Circle Details</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Define the basic structure of your savings circle.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Circle Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Example: Family Savings Circle"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Contribution Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={contributionAmount}
                  onChange={(e) => setContributionAmount(e.target.value)}
                  placeholder="100"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional notes about this circle..."
                  rows={4}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Max Members
                </label>
                <input
                  type="number"
                  value={maxMembers}
                  onChange={(e) => setMaxMembers(e.target.value)}
                  placeholder="10"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="submit"
                  disabled={busy}
                  className={cls(
                    "rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-sm transition",
                    busy
                      ? "cursor-not-allowed bg-emerald-300"
                      : "bg-emerald-600 hover:bg-emerald-500"
                  )}
                >
                  {busy ? "Creating..." : "Create Circle"}
                </button>

                <Link
                  href="/dashboard"
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </section>

          <aside className="space-y-4">
            <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h3 className="text-sm font-bold text-slate-900">Preview</h3>
              <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-sm font-semibold">
                  {name.trim() || "Your circle name"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  ${contributionAmount || "0"}/month
                </p>
                <div className="mt-3 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  Owner
                </div>
              </div>
            </section>

            <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h3 className="text-sm font-bold text-slate-900">Tips</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li>• Keep the name simple and recognizable.</li>
                <li>• Set a realistic monthly contribution.</li>
                <li>• Approve only trusted members.</li>
                <li>• Use payouts and contributions consistently each cycle.</li>
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}