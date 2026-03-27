"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type CircleRow = {
  id: number;
  name: string;
  contribution_amount: number;
  created_at: string;
  owner_auth_id: string;
};

type MemberRow = {
  id: number;
  circle_id: number;
  user_auth_id: string;
  role: string;
  status: string;
  joined_at: string | null;
  decided_at?: string | null;
  profile?: {
    id: string;
    email: string | null;
    full_name: string | null;
  } | null;
};

type ScheduleRow = {
  id: number;
  circle_id: number;
  cycle_no: number;
  recipient_user_id: string;
  schedule_position: number;
  status: "PENDING" | "READY" | "PAID";
  created_at: string;
  recipient?: {
    id: string;
    email: string | null;
    full_name: string | null;
  } | null;
};

type ContributionRow = {
  id: number;
  circle_id: number;
  user_auth_id: string;
  cycle_no: number;
  amount: number;
  status: string;
  paid_at: string | null;
  created_at: string;
};

type CircleDetailsResponse = {
  circle?: CircleRow;
  members?: MemberRow[];
  payoutSchedule?: ScheduleRow[];
  contributions?: ContributionRow[];
  error?: string;
};

function cls(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function Badge({
  children,
  color,
}: {
  children: React.ReactNode;
  color: "emerald" | "blue" | "rose" | "slate" | "amber";
}) {
  const map = {
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    blue: "bg-blue-50 text-blue-700 ring-blue-200",
    rose: "bg-rose-50 text-rose-700 ring-rose-200",
    slate: "bg-slate-100 text-slate-600 ring-slate-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
  };

  return (
    <span
      className={cls(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1",
        map[color]
      )}
    >
      {children}
    </span>
  );
}

function statusBadge(status: string) {
  if (status === "READY") return <Badge color="blue">READY</Badge>;
  if (status === "PAID") return <Badge color="emerald">PAID</Badge>;
  if (status === "APPROVED") return <Badge color="emerald">APPROVED</Badge>;
  if (status === "PENDING") return <Badge color="amber">PENDING</Badge>;
  if (status === "REJECTED") return <Badge color="rose">REJECTED</Badge>;
  return <Badge color="slate">{status}</Badge>;
}

export default function CircleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const id = useMemo(() => {
    const raw = params?.id;
    if (!raw) return null;
    if (Array.isArray(raw)) return Number(raw[0]);
    return Number(raw);
  }, [params]);

  const [userId, setUserId] = useState("");
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [busy, setBusy] = useState(false);

  const [circle, setCircle] = useState<CircleRow | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [schedule, setSchedule] = useState<ScheduleRow[]>([]);
  const [contributions, setContributions] = useState<ContributionRow[]>([]);

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    const init = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.replace("/auth/login");
          return;
        }

        setUserId(session.user.id);
      } finally {
        setLoadingAuth(false);
      }
    };

    init();
  }, [router, supabase]);

  const reload = async () => {
    if (id === null || !Number.isFinite(id)) return;

    setErr("");
    setMsg("");
    setLoadingData(true);

    try {
      const res = await fetch(`/api/circles/${id}`, {
        method: "GET",
        credentials: "include",
      });

      const data: CircleDetailsResponse = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to load circle");
      }

      setCircle(data.circle || null);
      setMembers(data.members || []);
      setSchedule(data.payoutSchedule || []);
      setContributions(data.contributions || []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load circle.");
      setCircle(null);
      setMembers([]);
      setSchedule([]);
      setContributions([]);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (!loadingAuth && userId && id !== null && Number.isFinite(id)) {
      reload();
    }
  }, [loadingAuth, userId, id]);

  const approvedMembers = members.filter((m) => m.status === "APPROVED");
  const isOwner = !!circle && circle.owner_auth_id === userId;

  const currentSchedule = useMemo(() => {
    return (
      schedule.find((row) => row.status !== "PAID") ||
      schedule[schedule.length - 1] ||
      null
    );
  }, [schedule]);

  const currentCycle = currentSchedule?.cycle_no ?? 1;

  const currentCycleContributions = contributions.filter(
    (c) => c.cycle_no === currentCycle
  );

  const hasContributedThisCycle = currentCycleContributions.some(
    (c) => c.user_auth_id === userId
  );

  const contributionCount = currentCycleContributions.length;
  const memberCount = approvedMembers.length;

  const canContribute =
    !!circle &&
    approvedMembers.some((m) => m.user_auth_id === userId) &&
    !hasContributedThisCycle &&
    !!currentSchedule &&
    currentSchedule.status !== "PAID";

  const canExecutePayout =
    isOwner &&
    !!currentSchedule &&
    currentSchedule.status === "READY";

  const onGenerateSchedule = async () => {
    if (id === null) return;

    try {
      setBusy(true);
      setErr("");
      setMsg("");

      const res = await fetch(`/api/payouts/schedule`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ circle_id: id }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Failed to generate payout schedule");
      }

      setMsg(data?.message || "Payout schedule generated.");
      await reload();
    } catch (e: any) {
      setErr(e?.message || "Failed to generate payout schedule.");
    } finally {
      setBusy(false);
    }
  };

  const onContribute = async () => {
    if (!circle || id === null) return;

    try {
      setBusy(true);
      setErr("");
      setMsg("");

      const res = await fetch(`/api/contributions/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          cycle_no: currentCycle,
          amount: Number(circle.contribution_amount),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Contribution failed");
      }

      setMsg(data?.message || "Contribution submitted successfully.");
      await reload();
    } catch (e: any) {
      setErr(e?.message || "Contribution failed.");
    } finally {
      setBusy(false);
    }
  };

  const onExecutePayout = async () => {
    if (id === null) return;

    try {
      setBusy(true);
      setErr("");
      setMsg("");

      const res = await fetch(`/api/circles/${id}/payouts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          cycleNo: currentCycle,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Payout failed");
      }

      setMsg(data?.message || "Payout executed successfully.");
      await reload();
    } catch (e: any) {
      setErr(e?.message || "Payout failed.");
    } finally {
      setBusy(false);
    }
  };

  if (id === null) return null;

  if (loadingAuth || loadingData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
          <p className="mt-4 text-sm text-slate-500">Loading circle…</p>
        </div>
      </div>
    );
  }

  if (!circle) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-rose-600">
            {err || "Circle not found or access denied."}
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-emerald-700 hover:text-emerald-600"
            >
              ← Back to Dashboard
            </Link>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
              {circle.name}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              ${circle.contribution_amount}/month · Circle #{circle.id}
            </p>
          </div>

          <button
            onClick={reload}
            disabled={busy}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        {err ? (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {err}
          </div>
        ) : null}

        {msg ? (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {msg}
          </div>
        ) : null}

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-medium text-slate-500">Approved Members</p>
            <p className="mt-1 text-2xl font-extrabold text-emerald-600">
              {memberCount}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-medium text-slate-500">Current Cycle</p>
            <p className="mt-1 text-2xl font-extrabold text-blue-600">
              {currentCycle}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-medium text-slate-500">Contributions</p>
            <p className="mt-1 text-2xl font-extrabold text-amber-600">
              {contributionCount}/{memberCount}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-medium text-slate-500">Cycle Status</p>
            <div className="mt-2">
              {currentSchedule ? statusBadge(currentSchedule.status) : <Badge color="slate">NO SCHEDULE</Badge>}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">Payout Schedule</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Transparent order with cycle status tracking
                  </p>
                </div>

                {isOwner ? (
                  <button
                    onClick={onGenerateSchedule}
                    disabled={busy || schedule.length > 0}
                    className={cls(
                      "rounded-xl px-4 py-2 text-xs font-bold text-white",
                      schedule.length > 0
                        ? "cursor-not-allowed bg-slate-300"
                        : "bg-emerald-600 hover:bg-emerald-500"
                    )}
                  >
                    {schedule.length > 0 ? "Schedule Exists" : "Generate Schedule"}
                  </button>
                ) : null}
              </div>

              {schedule.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">
                  No payout schedule yet.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {schedule.map((row) => (
                    <div
                      key={row.id}
                      className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4"
                    >
                      <div>
                        <p className="text-sm font-semibold">
                          Cycle {row.cycle_no}
                        </p>
                        <p className="mt-0.5 text-sm text-slate-600">
                          Recipient:{" "}
                          {row.recipient?.full_name ||
                            row.recipient?.email ||
                            row.recipient_user_id}
                        </p>
                      </div>
                      <div>{statusBadge(row.status)}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-lg font-bold">Members</h2>
              <p className="mt-1 text-sm text-slate-500">
                Approved and pending members in this circle
              </p>

              <div className="mt-4 space-y-3">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <div>
                      <p className="text-sm font-semibold">
                        {m.profile?.full_name || m.profile?.email || m.user_auth_id}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Role: {m.role}
                      </p>
                    </div>
                    <div>{statusBadge(m.status)}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-lg font-bold">Current Cycle Action</h2>
              <p className="mt-1 text-sm text-slate-500">
                Contribute or execute payout for cycle {currentCycle}
              </p>

              <div className="mt-4 space-y-4">
                <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                  <p className="text-xs font-medium text-slate-500">Cycle Recipient</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {currentSchedule?.recipient?.full_name ||
                      currentSchedule?.recipient?.email ||
                      currentSchedule?.recipient_user_id ||
                      "—"}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                  <p className="text-xs font-medium text-slate-500">Contribution Amount</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    ${circle.contribution_amount}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                  <p className="text-xs font-medium text-slate-500">Contribution Progress</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {contributionCount} of {memberCount} received
                  </p>
                </div>

                <button
                  onClick={onContribute}
                  disabled={busy || !canContribute}
                  className={cls(
                    "w-full rounded-2xl px-4 py-3 text-sm font-bold text-white",
                    canContribute
                      ? "bg-emerald-600 hover:bg-emerald-500"
                      : "cursor-not-allowed bg-slate-300"
                  )}
                >
                  {hasContributedThisCycle ? "Already Contributed" : "Submit Contribution"}
                </button>

                <button
                  onClick={onExecutePayout}
                  disabled={busy || !canExecutePayout}
                  className={cls(
                    "w-full rounded-2xl px-4 py-3 text-sm font-bold text-white",
                    canExecutePayout
                      ? "bg-blue-600 hover:bg-blue-500"
                      : "cursor-not-allowed bg-slate-300"
                  )}
                >
                  Execute Payout
                </button>

                {!isOwner ? (
                  <p className="text-xs text-slate-500">
                    Only the circle owner can execute payouts.
                  </p>
                ) : null}

                {currentSchedule?.status === "PENDING" ? (
                  <p className="text-xs text-amber-600">
                    Waiting for all contributions before payout becomes READY.
                  </p>
                ) : null}

                {currentSchedule?.status === "READY" ? (
                  <p className="text-xs text-blue-600">
                    All contributions are complete. Payout can now be executed.
                  </p>
                ) : null}

                {currentSchedule?.status === "PAID" ? (
                  <p className="text-xs text-emerald-600">
                    This cycle payout has already been completed.
                  </p>
                ) : null}
              </div>
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-lg font-bold">Cycle Contributions</h2>
              <p className="mt-1 text-sm text-slate-500">
                Payments recorded for cycle {currentCycle}
              </p>

              <div className="mt-4 space-y-3">
                {currentCycleContributions.length === 0 ? (
                  <p className="text-sm text-slate-500">No contributions yet.</p>
                ) : (
                  currentCycleContributions.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                    >
                      <p className="text-sm font-semibold">
                        User: {c.user_auth_id}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Amount: ${c.amount} · Status: {c.status}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}