"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getToken, logout } from "@/lib/client-auth";

type Circle = {
  id: number;
  owner_id: number;
  name: string;
  contribution_amount: string;
  created_at: string;
};

function cls(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function DashboardPage() {
  const token = useMemo(() => getToken(), []);

  const [loading, setLoading] = useState(true);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [error, setError] = useState("");

  // Create circle form
  const [createName, setCreateName] = useState("");
  const [createAmount, setCreateAmount] = useState<string>("50");
  const [createMsg, setCreateMsg] = useState("");
  const [createErr, setCreateErr] = useState("");
  const [createBusy, setCreateBusy] = useState(false);

  // Join circle form
  const [joinId, setJoinId] = useState("");
  const [joinMsg, setJoinMsg] = useState("");
  const [joinErr, setJoinErr] = useState("");
  const [joinBusy, setJoinBusy] = useState(false);

  useEffect(() => {
    if (!token) {
      window.location.href = "/login";
      return;
    }
  }, [token]);

  const loadCircles = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/circles/my", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Failed to load circles (${res.status})`);
      }

      const data = await res.json();
      setCircles(data?.circles ?? []);
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    loadCircles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateMsg("");
    setCreateErr("");

    const name = createName.trim();
    const amountNum = Number(createAmount);

    if (!name) {
      setCreateErr("Circle name is required.");
      return;
    }
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setCreateErr("Contribution amount must be a valid number > 0.");
      return;
    }

    setCreateBusy(true);
    try {
      const res = await fetch("/api/circles/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          contributionAmount: amountNum,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Create failed (${res.status})`);
      }

      setCreateMsg("Circle created successfully ✅");
      setCreateName("");
      // keep amount

      // refresh list
      await loadCircles();
    } catch (e: any) {
      setCreateErr(e?.message || "Create failed");
    } finally {
      setCreateBusy(false);
    }
  };

  const onJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinMsg("");
    setJoinErr("");

    const id = Number(joinId);
    if (!Number.isFinite(id) || id <= 0) {
      setJoinErr("Enter a valid Circle ID (number).");
      return;
    }

    setJoinBusy(true);
    try {
      const res = await fetch("/api/circles/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ circleId: id }),
      });

      const data = await res.json().catch(() => ({}));

      // Your API currently can return 409 for "already member" etc.
      if (!res.ok) {
        throw new Error(data?.error || `Join failed (${res.status})`);
      }

      setJoinMsg(data?.message || "Join request submitted ✅");
      setJoinId("");

      // refresh list (if your /my includes pending/approved)
      await loadCircles();
    } catch (e: any) {
      setJoinErr(e?.message || "Join failed");
    } finally {
      setJoinBusy(false);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <main className="min-h-screen bg-[#0b1220] text-slate-100">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b1220]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white/10 ring-1 ring-white/10" />
            <div className="leading-tight">
              <div className="text-sm font-semibold">CircleSave</div>
              <div className="text-[11px] text-slate-300">Dashboard</div>
            </div>
          </Link>

          <button
            onClick={handleLogout}
            className="rounded-xl bg-white/10 px-4 py-2 text-sm font-medium ring-1 ring-white/10 hover:bg-white/15"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Profile Card (like your screenshot style) */}
        <section className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-white/10 ring-1 ring-white/10" />
              <div>
                <div className="text-lg font-semibold">Welcome back 👋</div>
                <div className="mt-1 text-sm text-slate-300">
                  Manage circles • Create • Join • Track progress
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold ring-1 ring-white/10">
                Active circles: {circles.length}
              </span>
              <button
                onClick={loadCircles}
                className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#0b1220] hover:bg-white/90 ring-1 ring-white/20"
              >
                Refresh
              </button>
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl bg-rose-500/10 p-3 text-sm text-rose-200 ring-1 ring-rose-400/20">
              {error}
            </div>
          ) : null}
        </section>

        {/* Main Grid */}
        <div className="mt-5 grid gap-4 md:grid-cols-[1.35fr_.65fr]">
          {/* LEFT: My circles */}
          <section className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">My Circles</h2>
              <span className="text-xs text-slate-300">
                {loading ? "Loading..." : `${circles.length} total`}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {loading ? (
                <>
                  <div className="h-28 rounded-2xl bg-white/5 ring-1 ring-white/10 animate-pulse" />
                  <div className="h-28 rounded-2xl bg-white/5 ring-1 ring-white/10 animate-pulse" />
                </>
              ) : circles.length === 0 ? (
                <div className="text-sm text-slate-300">
                  No circles yet. Create one or join by Circle ID.
                </div>
              ) : (
                circles.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-2xl bg-[#0f172a] p-4 ring-1 ring-white/10"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">{c.name}</div>
                        <div className="mt-1 text-xs text-slate-400">
                          Circle #{c.id} • ${c.contribution_amount}/month
                        </div>
                      </div>

                      <Link
                        href={`/circles/${c.id}`}
                        className="rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-[#0b1220] hover:bg-white/90 ring-1 ring-white/20"
                      >
                        Open
                      </Link>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                      <span>Owner: {c.owner_id}</span>
                      <span>
                        {new Date(c.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* RIGHT: Create + Join */}
          <aside className="space-y-4">
            {/* Create Circle */}
            <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
              <h2 className="text-sm font-semibold">Create a Circle</h2>
              <p className="mt-1 text-xs text-slate-300">
                Start a private circle and invite members.
              </p>

              <form onSubmit={onCreate} className="mt-4 space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-300">
                    Circle name
                  </label>
                  <input
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="Feb Saving Group"
                    className="w-full rounded-2xl bg-[#0f172a] px-4 py-3 text-sm outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-white/30"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-slate-300">
                    Monthly contribution ($)
                  </label>
                  <input
                    value={createAmount}
                    onChange={(e) => setCreateAmount(e.target.value)}
                    inputMode="decimal"
                    placeholder="50"
                    className="w-full rounded-2xl bg-[#0f172a] px-4 py-3 text-sm outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-white/30"
                  />
                </div>

                {createErr ? (
                  <div className="rounded-2xl bg-rose-500/10 p-3 text-sm text-rose-200 ring-1 ring-rose-400/20">
                    {createErr}
                  </div>
                ) : null}

                {createMsg ? (
                  <div className="rounded-2xl bg-emerald-500/10 p-3 text-sm text-emerald-200 ring-1 ring-emerald-400/20">
                    {createMsg}
                  </div>
                ) : null}

                <button
                  disabled={createBusy}
                  className={cls(
                    "w-full rounded-2xl px-4 py-3 text-sm font-semibold ring-1 transition",
                    createBusy
                      ? "cursor-not-allowed bg-white/5 text-slate-400 ring-white/10"
                      : "bg-white text-[#0b1220] hover:bg-white/90 ring-white/20"
                  )}
                >
                  {createBusy ? "Creating..." : "Create Circle"}
                </button>
              </form>
            </div>

            {/* Join Circle */}
            <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
              <h2 className="text-sm font-semibold">Join a Circle</h2>
              <p className="mt-1 text-xs text-slate-300">
                Enter a Circle ID to request access.
              </p>

              <form onSubmit={onJoin} className="mt-4 space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-300">
                    Circle ID
                  </label>
                  <input
                    value={joinId}
                    onChange={(e) => setJoinId(e.target.value)}
                    placeholder="1"
                    inputMode="numeric"
                    className="w-full rounded-2xl bg-[#0f172a] px-4 py-3 text-sm outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-white/30"
                  />
                </div>

                {joinErr ? (
                  <div className="rounded-2xl bg-rose-500/10 p-3 text-sm text-rose-200 ring-1 ring-rose-400/20">
                    {joinErr}
                  </div>
                ) : null}

                {joinMsg ? (
                  <div className="rounded-2xl bg-emerald-500/10 p-3 text-sm text-emerald-200 ring-1 ring-emerald-400/20">
                    {joinMsg}
                  </div>
                ) : null}

                <button
                  disabled={joinBusy}
                  className={cls(
                    "w-full rounded-2xl px-4 py-3 text-sm font-semibold ring-1 transition",
                    joinBusy
                      ? "cursor-not-allowed bg-white/5 text-slate-400 ring-white/10"
                      : "bg-white text-[#0b1220] hover:bg-white/90 ring-white/20"
                  )}
                >
                  {joinBusy ? "Requesting..." : "Request to Join"}
                </button>
              </form>
            </div>
          </aside>
        </div>
      </div>

      <footer className="mx-auto max-w-6xl px-4 pb-10 pt-6 text-xs text-slate-400">
        CircleSave • Dashboard (MVP)
      </footer>
    </main>
  );
}
