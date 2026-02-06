"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getToken } from "@/lib/client-auth";

type Member = {
  id: number;
  user_id: number;
  full_name?: string | null;
  email?: string;
  role: string;
  status: string;
};

type PollResult = {
  nominee_user_id: number;
  full_name: string | null;
  email: string;
  votes: number;
};

export default function CirclePage() {
  const params = useParams();
  const router = useRouter();
  const token = useMemo(() => getToken(), []);
  const circleId = Number(params.id);

  const [members, setMembers] = useState<Member[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // payout / wheel
  const [monthKey, setMonthKey] = useState("");
  const [payout, setPayout] = useState<any>(null);
  const [spinning, setSpinning] = useState(false);
  const [spinWinner, setSpinWinner] = useState<any>(null);

  // poll
  const [poll, setPoll] = useState<any>(null);
  const [pollResults, setPollResults] = useState<PollResult[]>([]);
  const [voteNomineeId, setVoteNomineeId] = useState<number | "">("");

  function toast(ok?: string, err?: string) {
    setSuccess(ok || "");
    setError(err || "");
    if (ok || err) setTimeout(() => (setSuccess(""), setError("")), 3500);
  }

  async function authedFetch(path: string, init?: RequestInit) {
    const res = await fetch(path, {
      ...init,
      headers: {
        ...(init?.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "Server error");
    return data;
  }

  async function loadAll() {
    try {
      const m = await authedFetch(`/api/circles/${circleId}/members`);
      setMembers(m.members || []);
      setIsAdmin(!!m.isAdmin);

      const p = await authedFetch(`/api/circles/${circleId}/payout`);
      setMonthKey(p.monthKey);
      setPayout(p.payout);

      const pollData = await authedFetch(`/api/circles/${circleId}/poll`);
      setMonthKey(pollData.monthKey);
      setPoll(pollData.poll);
      setPollResults(pollData.results || []);
    } catch (e: any) {
      toast("", e.message || "Failed");
    }
  }

  useEffect(() => {
    if (!token) router.push("/login");
  }, [router, token]);

  useEffect(() => {
    if (token && circleId) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, circleId]);

  async function removeMember(userId: number) {
    try {
      await authedFetch(`/api/circles/${circleId}/members/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      toast("Member removed ✅");
      await loadAll();
    } catch (e: any) {
      toast("", e.message || "Remove failed");
    }
  }

  async function spinWheel() {
    try {
      setSpinning(true);
      setSpinWinner(null);
      toast("", "");

      // Fake animation delay + server winner
      const data = await authedFetch(`/api/circles/${circleId}/payout/spin`, {
        method: "POST",
      });

      // show animation for ~2.5s
      const winner = data.winner;
      setTimeout(() => {
        setSpinWinner(winner);
        setPayout({ full_name: winner.full_name, email: winner.email, created_at: new Date().toISOString() });
        toast(`Winner selected ✅ ${winner.full_name || winner.email}`);
        setSpinning(false);
      }, 2500);
    } catch (e: any) {
      setSpinning(false);
      toast("", e.message || "Spin failed");
    }
  }

  async function pollCreate() {
    try {
      await authedFetch(`/api/circles/${circleId}/poll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create" }),
      });
      toast("Poll created ✅");
      await loadAll();
    } catch (e: any) {
      toast("", e.message || "Poll create failed");
    }
  }

  async function pollClose() {
    try {
      await authedFetch(`/api/circles/${circleId}/poll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "close" }),
      });
      toast("Poll closed ✅");
      await loadAll();
    } catch (e: any) {
      toast("", e.message || "Poll close failed");
    }
  }

  async function vote() {
    try {
      if (!voteNomineeId) return toast("", "Pick a nominee");
      await authedFetch(`/api/circles/${circleId}/poll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "vote", nomineeUserId: voteNomineeId }),
      });
      toast("Vote saved ✅");
      await loadAll();
    } catch (e: any) {
      toast("", e.message || "Vote failed");
    }
  }

  const approvedMembers = members.filter((m) => m.status === "APPROVED");

  return (
    <main className="min-h-screen bg-[#f0f2f5]">
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-blue-600" />
            <span className="text-lg font-semibold tracking-tight">CircleSave</span>
          </Link>
          <Link className="text-sm text-blue-700 hover:underline" href="/dashboard">
            Back to dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-bold text-slate-900">Circle #{circleId}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Members • Poll • Wheel payout ({monthKey || "this month"})
        </p>

        {(error || success) && (
          <div
            className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${
              error
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {error || success}
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {/* Members */}
          <section className="rounded-3xl border bg-white p-6 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Members ({approvedMembers.length})
              </h2>
              <span className="text-xs text-slate-500">
                {isAdmin ? "Admin view" : "Member view"}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {approvedMembers.length === 0 ? (
                <div className="rounded-2xl border bg-slate-50 p-4 text-sm text-slate-600">
                  No approved members yet.
                </div>
              ) : (
                approvedMembers.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-2xl border p-4">
                    <div>
                      <p className="font-medium text-slate-900">
                        {m.full_name || "Unnamed"}{" "}
                        <span className="text-xs text-slate-500">({m.role})</span>
                      </p>
                      {isAdmin && m.email && <p className="text-xs text-slate-500">{m.email}</p>}
                    </div>

                    {isAdmin && m.role !== "ADMIN" && (
                      <button
                        onClick={() => removeMember(m.user_id)}
                        className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Payout / Wheel */}
          <section className="rounded-3xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Wheel payout</h2>
            <p className="mt-1 text-xs text-slate-500">
              Admin spins once per month. Result stored in DB.
            </p>

            <div className="mt-4 rounded-3xl border bg-slate-50 p-5">
              <div
                className={`mx-auto flex h-44 w-44 items-center justify-center rounded-full border bg-white text-center text-sm font-semibold ${
                  spinning ? "animate-spin" : ""
                }`}
                title="Wheel (MVP visual)"
              >
                {spinning ? "Spinning..." : "Wheel"}
              </div>

              <div className="mt-4 rounded-2xl border bg-white p-4">
                <p className="text-xs text-slate-500">This month winner</p>
                {payout ? (
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {payout.full_name || payout.email}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-slate-600">Not selected yet.</p>
                )}
              </div>

              {spinWinner && (
                <div className="mt-3 rounded-2xl border bg-emerald-50 p-3 text-sm text-emerald-700">
                  Winner: <b>{spinWinner.full_name || spinWinner.email}</b>
                </div>
              )}

              <button
                onClick={spinWheel}
                disabled={!isAdmin || spinning || !!payout}
                className="mt-4 h-11 w-full rounded-xl bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-60"
              >
                {payout ? "Already selected" : !isAdmin ? "Admin only" : spinning ? "Spinning..." : "Spin wheel"}
              </button>
            </div>
          </section>

          {/* Poll */}
          <section className="rounded-3xl border bg-white p-6 shadow-sm lg:col-span-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Monthly poll</h2>
                <p className="text-xs text-slate-500">
                  Members vote who should receive payout. Admin can close poll.
                </p>
              </div>

              {isAdmin && (
                <div className="flex gap-2">
                  <button
                    onClick={pollCreate}
                    className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    Create poll
                  </button>
                  <button
                    onClick={pollClose}
                    className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    Close poll
                  </button>
                </div>
              )}
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {/* Vote */}
              <div className="rounded-3xl border bg-slate-50 p-5">
                <h3 className="text-sm font-semibold text-slate-900">Vote</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {poll ? `Status: ${poll.status}` : "Poll not created yet"}
                </p>

                <select
                  value={voteNomineeId}
                  onChange={(e) => setVoteNomineeId(e.target.value ? Number(e.target.value) : "")}
                  className="mt-3 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                  disabled={!poll || poll.status !== "OPEN"}
                >
                  <option value="">Select member</option>
                  {approvedMembers.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.full_name || `User ${m.user_id}`}
                    </option>
                  ))}
                </select>

                <button
                  onClick={vote}
                  disabled={!poll || poll.status !== "OPEN"}
                  className="mt-3 h-11 w-full rounded-xl bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-60"
                >
                  Submit vote
                </button>
              </div>

              {/* Results */}
              <div className="rounded-3xl border bg-slate-50 p-5">
                <h3 className="text-sm font-semibold text-slate-900">Results</h3>
                <p className="mt-1 text-xs text-slate-500">Live counts</p>

                <div className="mt-3 space-y-3">
                  {pollResults.length === 0 ? (
                    <div className="rounded-2xl border bg-white p-4 text-sm text-slate-600">
                      No votes yet.
                    </div>
                  ) : (
                    pollResults.map((r) => (
                      <div key={r.nominee_user_id} className="rounded-2xl border bg-white p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-slate-900">
                            {r.full_name || r.email}
                          </p>
                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                            {r.votes} votes
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <p className="mt-5 text-xs text-slate-500">
              Note: In MVP, poll and wheel are separate. Later we can let admin select winner from poll top votes.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
