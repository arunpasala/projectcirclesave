"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { clearToken, getToken } from "@/lib/client-auth";

type Circle = {
  id: number;
  name: string;
  contribution_amount: string; // coming from Postgres numeric -> string often
  owner_id: number;
  created_at: string;
};

export default function DashboardPage() {
  const router = useRouter();

  const [circles, setCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);

  // Create circle form
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState<string>("");

  // Join circle form
  const [joinId, setJoinId] = useState<string>("");

  const [err, setErr] = useState<string>("");
  const [ok, setOk] = useState<string>("");

  const token = useMemo(() => getToken(), []);

  async function refresh() {
    setErr("");
    setOk("");
    setLoading(true);
    try {
      // Expecting API to return something like: { circles: [...] } OR just [...]
      const data = await api<any>("/api/circles/my");

      const list: Circle[] = Array.isArray(data) ? data : data.circles ?? [];
      setCircles(list);
    } catch (e: any) {
      setErr(e?.message || "Failed to load circles.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) {
      router.replace("/login");
      return;
    }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setOk("");

    if (!newName.trim()) return setErr("Circle name is required.");
    const amt = Number(newAmount);
    if (!newAmount || Number.isNaN(amt) || amt <= 0) return setErr("Contribution amount must be a positive number.");

    try {
      await api("/api/circles/create", {
        method: "POST",
        body: JSON.stringify({ name: newName.trim(), contributionAmount: amt }),
      });

      setOk("Circle created.");
      setNewName("");
      setNewAmount("");
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "Create failed.");
    }
  }

  async function onJoin(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setOk("");

    const id = Number(joinId);
    if (!joinId || Number.isNaN(id) || id <= 0) return setErr("Enter a valid Circle ID.");

    try {
      await api("/api/circles/join", {
        method: "POST",
        body: JSON.stringify({ circleId: id }),
      });

      setOk("Joined circle.");
      setJoinId("");
      await refresh();
    } catch (e: any) {
      // common: 409 already member
      setErr(e?.message || "Join failed.");
    }
  }

  function logout() {
    clearToken();
    router.replace("/login");
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top bar */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-600 text-white font-bold">
              C
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">CircleSave</p>
              <p className="text-xs text-slate-500 leading-tight">Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="hidden rounded-xl border bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 md:inline-flex"
            >
              Home
            </Link>
            <button
              onClick={logout}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
          {/* Left: My circles */}
          <div>
            <div className="flex items-end justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">My circles</h1>
                <p className="mt-1 text-sm text-slate-600">
                  View your circles, create a new one, or join by ID.
                </p>
              </div>

              <button
                onClick={refresh}
                className="rounded-xl border bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Refresh
              </button>
            </div>

            {(err || ok) && (
              <div
                className={[
                  "mt-4 rounded-2xl border p-4 text-sm",
                  err ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700",
                ].join(" ")}
              >
                {err || ok}
              </div>
            )}

            <div className="mt-6 rounded-3xl border bg-white p-5 shadow-sm">
              {loading ? (
                <p className="text-sm text-slate-600">Loading...</p>
              ) : circles.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm font-medium">No circles yet.</p>
                  <p className="mt-1 text-sm text-slate-600">Create one on the right or join using a Circle ID.</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {circles.map((c) => (
                    <div key={c.id} className="rounded-2xl border bg-white p-4 hover:bg-slate-50">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{c.name}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            Circle ID: <span className="font-medium text-slate-700">{c.id}</span>
                          </p>
                        </div>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          ${c.contribution_amount}
                        </span>
                      </div>
                      <p className="mt-3 text-xs text-slate-500">
                        Created: {new Date(c.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Forms */}
          <aside className="space-y-6">
            {/* Create circle */}
            <div className="rounded-3xl border bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold">Create a circle</h2>
              <p className="mt-1 text-sm text-slate-600">Start a new savings circle.</p>

              <form onSubmit={onCreate} className="mt-5 space-y-3">
                <div>
                  <label className="text-sm font-medium">Circle name</label>
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g., Feb Savings Group"
                    className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Contribution amount</label>
                  <input
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    placeholder="e.g., 50"
                    inputMode="decimal"
                    className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <button
                  type="submit"
                  className="mt-2 w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Create circle
                </button>
              </form>
            </div>

            {/* Join circle */}
            <div className="rounded-3xl border bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold">Join a circle</h2>
              <p className="mt-1 text-sm text-slate-600">Enter an existing Circle ID.</p>

              <form onSubmit={onJoin} className="mt-5 space-y-3">
                <div>
                  <label className="text-sm font-medium">Circle ID</label>
                  <input
                    value={joinId}
                    onChange={(e) => setJoinId(e.target.value)}
                    placeholder="e.g., 1"
                    inputMode="numeric"
                    className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <button
                  type="submit"
                  className="mt-2 w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold hover:bg-slate-50"
                >
                  Join circle
                </button>
              </form>

              <p className="mt-3 text-xs text-slate-500">
                Tip: If you’re already a member you may see a conflict error (409).
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
