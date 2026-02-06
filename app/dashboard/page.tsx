"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/app/components/AppHeader";
import { getToken } from "@/lib/client-auth";

type Circle = {
  id: number;
  owner_id: number;
  name: string;
  contribution_amount: string | number;
  created_at: string;
};

function money(v: any) {
  const num = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(num)) return v;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
}

export default function DashboardPage() {
  const router = useRouter();
  const token = useMemo(() => getToken(), []);

  const [loading, setLoading] = useState(true);

  // lists
  const [myCircles, setMyCircles] = useState<Circle[]>([]);
  const [allCircles, setAllCircles] = useState<Circle[]>([]);

  // create circle form
  const [circleName, setCircleName] = useState("");
  const [contributionAmount, setContributionAmount] = useState<number>(50);

  // join form
  const [joinCircleId, setJoinCircleId] = useState<number | "">("");

  // errors / success
  const [errMy, setErrMy] = useState("");
  const [errAll, setErrAll] = useState("");
  const [errCreate, setErrCreate] = useState("");
  const [errJoin, setErrJoin] = useState("");

  const [okCreate, setOkCreate] = useState("");
  const [okJoin, setOkJoin] = useState("");

  async function fetchMyCircles(jwt: string) {
    setErrMy("");
    try {
      const res = await fetch("/api/circles/my", {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to load your circles");
      setMyCircles(data.circles || []);
    } catch (e: any) {
      setErrMy(e.message || "Server error");
      setMyCircles([]);
    }
  }

  async function fetchAllCircles(jwt: string) {
    setErrAll("");
    try {
      const res = await fetch("/api/circles/all", {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to load circles");
      setAllCircles(data.circles || []);
    } catch (e: any) {
      setErrAll(e.message || "Server error");
      setAllCircles([]);
    }
  }

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }

    (async () => {
      setLoading(true);
      await Promise.all([fetchMyCircles(token), fetchAllCircles(token)]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function onCreateCircle(e: React.FormEvent) {
    e.preventDefault();
    setErrCreate("");
    setOkCreate("");
    setOkJoin("");
    setErrJoin("");

    if (!circleName.trim()) {
      setErrCreate("Please enter a circle name.");
      return;
    }

    try {
      const res = await fetch("/api/circles/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: circleName.trim(),
          contributionAmount,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Create circle failed");

      setOkCreate(`Circle created: ${data.circle?.name || "Success"}`);
      setCircleName("");
      setContributionAmount(50);

      await Promise.all([fetchMyCircles(token), fetchAllCircles(token)]);
    } catch (e: any) {
      setErrCreate(e.message || "Server error");
    }
  }

  async function onJoinCircle(e: React.FormEvent) {
    e.preventDefault();
    setErrJoin("");
    setOkJoin("");
    setOkCreate("");
    setErrCreate("");

    if (!joinCircleId) {
      setErrJoin("Please select a circle.");
      return;
    }

    try {
      const res = await fetch("/api/circles/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ circleId: joinCircleId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Join request failed");

      // Your API currently returns 409 if already requested/joined
      // and success message otherwise.
      setOkJoin(data?.message || "Join request sent.");

      setJoinCircleId("");
      await Promise.all([fetchMyCircles(token), fetchAllCircles(token)]);
    } catch (e: any) {
      setErrJoin(e.message || "Server error");
    }
  }

  return (
    <main className="min-h-screen bg-[#f0f2f5]">
      <AppHeader />

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-1 text-slate-600">
            Create circles, request to join circles, and track your memberships.
          </p>
        </div>

        {/* 2-column layout */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* LEFT: My circles */}
          <section className="lg:col-span-2">
            <div className="rounded-2xl border bg-white shadow-sm">
              <div className="border-b px-5 py-4">
                <h2 className="text-lg font-semibold">My circles</h2>
                <p className="text-sm text-slate-600">Circles you own or are a member of.</p>
              </div>

              <div className="p-5">
                {loading ? (
                  <div className="text-sm text-slate-600">Loading…</div>
                ) : errMy ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {errMy}
                  </div>
                ) : myCircles.length === 0 ? (
                  <div className="rounded-xl border bg-slate-50 px-4 py-6 text-sm text-slate-700">
                    No circles yet.
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {myCircles.map((c) => (
                      <div key={c.id} className="rounded-2xl border bg-white p-4 hover:bg-slate-50">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                            <p className="mt-1 text-xs text-slate-600">
                              Contribution: <span className="font-medium">{money(c.contribution_amount)}</span>
                            </p>
                          </div>

                          <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
                            #{c.id}
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

            {/* ALL circles list */}
            <div className="mt-6 rounded-2xl border bg-white shadow-sm">
              <div className="border-b px-5 py-4">
                <h2 className="text-lg font-semibold">All circles</h2>
                <p className="text-sm text-slate-600">Browse circles (members hidden). Request to join.</p>
              </div>

              <div className="p-5">
                {loading ? (
                  <div className="text-sm text-slate-600">Loading…</div>
                ) : errAll ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {errAll}
                  </div>
                ) : allCircles.length === 0 ? (
                  <div className="rounded-xl border bg-slate-50 px-4 py-6 text-sm text-slate-700">
                    No circles found.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border">
                    <div className="grid grid-cols-12 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-600">
                      <div className="col-span-6">Name</div>
                      <div className="col-span-3">Contribution</div>
                      <div className="col-span-3 text-right">ID</div>
                    </div>
                    {allCircles.map((c) => (
                      <div
                        key={c.id}
                        className="grid grid-cols-12 px-4 py-3 text-sm hover:bg-slate-50"
                      >
                        <div className="col-span-6 font-medium text-slate-900">{c.name}</div>
                        <div className="col-span-3 text-slate-700">{money(c.contribution_amount)}</div>
                        <div className="col-span-3 text-right text-slate-600">#{c.id}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* RIGHT: Actions */}
          <aside className="space-y-6">
            {/* Create circle */}
            <div className="rounded-2xl border bg-white shadow-sm">
              <div className="border-b px-5 py-4">
                <h3 className="text-base font-semibold">Create a circle</h3>
                <p className="text-sm text-slate-600">You become the circle head (owner).</p>
              </div>

              <form onSubmit={onCreateCircle} className="p-5 space-y-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">Circle name</label>
                  <input
                    value={circleName}
                    onChange={(e) => setCircleName(e.target.value)}
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/20"
                    placeholder="Feb Saving Group"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">Contribution amount</label>
                  <input
                    type="number"
                    value={contributionAmount}
                    onChange={(e) => setContributionAmount(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/20"
                    min={1}
                  />
                </div>

                {errCreate && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {errCreate}
                  </div>
                )}
                {okCreate && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    {okCreate}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Create circle
                </button>
              </form>
            </div>

            {/* Join circle */}
            <div className="rounded-2xl border bg-white shadow-sm">
              <div className="border-b px-5 py-4">
                <h3 className="text-base font-semibold">Request to join</h3>
                <p className="text-sm text-slate-600">Admin approval required (status: PENDING).</p>
              </div>

              <form onSubmit={onJoinCircle} className="p-5 space-y-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">Select a circle</label>
                  <select
                    value={joinCircleId}
                    onChange={(e) => setJoinCircleId(e.target.value ? Number(e.target.value) : "")}
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/20"
                  >
                    <option value="">Choose…</option>
                    {allCircles.map((c) => (
                      <option key={c.id} value={c.id}>
                        #{c.id} — {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {errJoin && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {errJoin}
                  </div>
                )}
                {okJoin && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    {okJoin}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Send join request
                </button>

                <p className="text-xs text-slate-500">
                  If you see “Conflict (409)”, you already requested or you’re already a member.
                </p>
              </form>
            </div>
          </aside>
        </div>

        <p className="mt-8 text-center text-xs text-slate-500">© {new Date().getFullYear()} CircleSave</p>
      </div>
    </main>
  );
}
