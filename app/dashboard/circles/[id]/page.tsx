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
  fairness_mode: "JOIN_ORDER" | "RANDOM_FIXED";
};

type MemberRow = {
  id: number;
  user_auth_id: string;
  role: string;
  status: string;
  joined_at?: string | null;
  name?: string;
  email?: string;
};

type ScheduleRow = {
  id: number;
  cycle_no: number;
  recipient_user_id: string;
  schedule_position?: number;
  status: "PENDING" | "READY" | "PAID";
  recipient_name?: string;
  recipient_email?: string;
};

type CycleRow = {
  id: number;
  circle_id: number;
  cycle_no: number;
  recipient_user_id: string;
  month_key: string;
  amount_per_member: number;
  total_members: number;
  expected_total: number;
  status: "OPEN" | "READY" | "COMPLETED";
};

type CyclePaymentRow = {
  id: number;
  cycle_id: number;
  circle_id: number;
  payer_user_id: string;
  payee_user_id: string;
  amount: number;
  payment_method: string;
  transfer_reference?: string | null;
  payment_status: "PENDING" | "SUBMITTED" | "CONFIRMED";
};

type CircleDetailsResponse = {
  circle?: CircleRow;
  members?: MemberRow[];
  payoutSchedule?: ScheduleRow[];
  cycles?: CycleRow[];
  cyclePayments?: CyclePaymentRow[];
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
  if (status === "OPEN") return <Badge color="amber">OPEN</Badge>;
  if (status === "COMPLETED") return <Badge color="emerald">COMPLETED</Badge>;
  if (status === "SUBMITTED") return <Badge color="blue">SUBMITTED</Badge>;
  if (status === "CONFIRMED") return <Badge color="emerald">CONFIRMED</Badge>;
  return <Badge color="slate">{status}</Badge>;
}

function getInitial(name?: string, email?: string) {
  const text = name || email || "U";
  return text.trim().charAt(0).toUpperCase();
}

function toReadableError(message: string) {
  if (message.includes("No pending payout schedule")) {
    return "Generate the payout schedule before opening a monthly cycle.";
  }
  if (message.includes("already open")) {
    return "A monthly cycle is already active for this circle.";
  }
  if (message.includes("At least two approved members")) {
    return "You need at least two approved members before opening a cycle.";
  }
  if (message.includes("No eligible payers")) {
    return "No eligible payers were found for this cycle.";
  }
  if (message.includes("Cycle was created, but payment rows failed")) {
    return message;
  }
  return message;
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
  const [cycles, setCycles] = useState<CycleRow[]>([]);
  const [cyclePayments, setCyclePayments] = useState<CyclePaymentRow[]>([]);

  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [transferReference, setTransferReference] = useState("");
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
      setCycles(data.cycles || []);
      setCyclePayments(data.cyclePayments || []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load circle.");
      setCircle(null);
      setMembers([]);
      setSchedule([]);
      setCycles([]);
      setCyclePayments([]);
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
  const memberCount = approvedMembers.length;
  const isOwner = !!circle && circle.owner_auth_id === userId;

  const activeCycle = useMemo(() => {
    return cycles.find((c) => c.status === "OPEN" || c.status === "READY") || null;
  }, [cycles]);

  const activeCyclePayments = useMemo(() => {
    if (!activeCycle) return [];
    return cyclePayments.filter((p) => p.cycle_id === activeCycle.id);
  }, [activeCycle, cyclePayments]);

  const currentSchedule = useMemo(() => {
    return (
      schedule.find((row) => row.status !== "PAID") ||
      schedule[schedule.length - 1] ||
      null
    );
  }, [schedule]);

  const contributionCount = activeCyclePayments.filter(
    (p) => p.payment_status === "SUBMITTED" || p.payment_status === "CONFIRMED"
  ).length;

  const hasSubmittedPayment = activeCyclePayments.some(
    (p) =>
      p.payer_user_id === userId &&
      (p.payment_status === "SUBMITTED" || p.payment_status === "CONFIRMED")
  );

  const isRecipient = activeCycle?.recipient_user_id === userId;
  const canOpenCycle = isOwner && !activeCycle && schedule.length > 0;
  const canSubmitPayment =
    !!activeCycle && !isRecipient && !hasSubmittedPayment && activeCycle.status === "OPEN";
  const canCompleteCycle = isOwner && !!activeCycle && activeCycle.status === "READY";

  const onGenerateSchedule = async () => {
    if (id === null) return;

    try {
      setBusy(true);
      setErr("");
      setMsg("");

      const res = await fetch(`/api/payouts/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      setErr(toReadableError(e?.message || "Failed to generate payout schedule."));
    } finally {
      setBusy(false);
    }
  };

  const onOpenCycle = async () => {
    if (id === null) return;

    try {
      setBusy(true);
      setErr("");
      setMsg("");

      const res = await fetch("/api/cycles/open", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ circle_id: id }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const readableError =
          data?.error ||
          data?.message ||
          `Failed to open monthly cycle (HTTP ${res.status}).`;
        throw new Error(readableError);
      }

      setMsg(data?.message || "Monthly cycle opened successfully.");
      await reload();
    } catch (e: any) {
      setErr(toReadableError(e?.message || "Failed to open monthly cycle."));
    } finally {
      setBusy(false);
    }
  };

  const onSubmitPayment = async () => {
    if (!activeCycle) return;

    try {
      setBusy(true);
      setErr("");
      setMsg("");

      const res = await fetch(`/api/cycles/${activeCycle.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          payment_method: paymentMethod,
          transfer_reference: transferReference,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Failed to submit payment");
      }

      setMsg(data?.message || "Payment submitted successfully.");
      setTransferReference("");
      await reload();
    } catch (e: any) {
      setErr(toReadableError(e?.message || "Failed to submit payment."));
    } finally {
      setBusy(false);
    }
  };

  const onCompleteCycle = async () => {
    if (!activeCycle) return;

    try {
      setBusy(true);
      setErr("");
      setMsg("");

      const res = await fetch(`/api/cycles/${activeCycle.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Failed to complete cycle");
      }

      setMsg(data?.message || "Cycle completed successfully.");
      await reload();
    } catch (e: any) {
      setErr(toReadableError(e?.message || "Failed to complete cycle."));
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
            <Link href="/dashboard" className="text-sm font-medium text-emerald-700 hover:text-emerald-600">
              ← Back to Dashboard
            </Link>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">{circle.name}</h1>
            <p className="mt-1 text-sm text-slate-500">
              ${circle.contribution_amount}/month · Circle #{circle.id}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Fairness Mode: {circle.fairness_mode === "RANDOM_FIXED" ? "Randomized Fixed Rotation" : "Join Order"}
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
            <p className="mt-1 text-2xl font-extrabold text-emerald-600">{memberCount}</p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-medium text-slate-500">Current Cycle</p>
            <p className="mt-1 text-2xl font-extrabold text-blue-600">
              {activeCycle?.cycle_no || currentSchedule?.cycle_no || 1}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-medium text-slate-500">Payments</p>
            <p className="mt-1 text-2xl font-extrabold text-amber-600">
              {contributionCount}/{Math.max(memberCount - 1, 0)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-medium text-slate-500">Cycle Status</p>
            <div className="mt-2">
              {activeCycle ? statusBadge(activeCycle.status) : <Badge color="slate">NO CYCLE</Badge>}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">Payout Schedule</h2>
                  <p className="mt-1 text-sm text-slate-500">Transparent order with cycle status tracking</p>
                </div>

                <div className="flex gap-2">
                  {isOwner && schedule.length === 0 ? (
                    <button
                      onClick={onGenerateSchedule}
                      disabled={busy}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      Generate Schedule
                    </button>
                  ) : null}

                  {isOwner ? (
                    <button
                      onClick={onOpenCycle}
                      disabled={busy || !canOpenCycle}
                      className={cls(
                        "rounded-xl px-4 py-2 text-xs font-bold text-white",
                        canOpenCycle
                          ? "bg-blue-600 hover:bg-blue-500"
                          : "cursor-not-allowed bg-slate-300"
                      )}
                    >
                      Open Monthly Cycle
                    </button>
                  ) : null}
                </div>
              </div>

              {schedule.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">No payout schedule yet.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {schedule.map((row) => (
                    <div
                      key={row.id}
                      className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4"
                    >
                      <div>
                        <p className="text-sm font-semibold">Cycle {row.cycle_no}</p>
                        <p className="mt-0.5 text-sm text-slate-600">
                          Recipient: {row.recipient_name || row.recipient_email || row.recipient_user_id}
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
              <p className="mt-1 text-sm text-slate-500">Approved and pending members in this circle</p>

              <div className="mt-4 space-y-3">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 font-semibold text-white">
                        {getInitial(m.name, m.email)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {m.name || m.email || m.user_auth_id || "Unknown User"}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">Role: {m.role}</p>
                      </div>
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
                Contribute or complete the active monthly payout cycle
              </p>

              <div className="mt-4 space-y-4">
                <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                  <p className="text-xs font-medium text-slate-500">Cycle Recipient</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {currentSchedule?.recipient_name ||
                      currentSchedule?.recipient_email ||
                      activeCycle?.recipient_user_id ||
                      "—"}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                  <p className="text-xs font-medium text-slate-500">Contribution Amount</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    ${activeCycle?.amount_per_member || circle.contribution_amount}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                  <p className="text-xs font-medium text-slate-500">Payment Progress</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {contributionCount} of {Math.max(memberCount - 1, 0)} received
                  </p>
                </div>

                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                >
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>

                <input
                  type="text"
                  placeholder="Transfer reference (optional)"
                  value={transferReference}
                  onChange={(e) => setTransferReference(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                />

                <button
                  onClick={onSubmitPayment}
                  disabled={busy || !canSubmitPayment}
                  className={cls(
                    "w-full rounded-2xl px-4 py-3 text-sm font-bold text-white",
                    canSubmitPayment
                      ? "bg-emerald-600 hover:bg-emerald-500"
                      : "cursor-not-allowed bg-slate-300"
                  )}
                >
                  {hasSubmittedPayment ? "Payment Submitted" : "Submit Payment"}
                </button>

                <button
                  onClick={onCompleteCycle}
                  disabled={busy || !canCompleteCycle}
                  className={cls(
                    "w-full rounded-2xl px-4 py-3 text-sm font-bold text-white",
                    canCompleteCycle
                      ? "bg-blue-600 hover:bg-blue-500"
                      : "cursor-not-allowed bg-slate-300"
                  )}
                >
                  Complete Cycle
                </button>

                {!isOwner ? (
                  <p className="text-xs text-slate-500">
                    Only the circle owner can complete the cycle.
                  </p>
                ) : null}

                {isRecipient ? (
                  <p className="text-xs text-amber-600">
                    You are the recipient for this cycle and do not need to submit payment.
                  </p>
                ) : null}

                {activeCycle?.status === "OPEN" ? (
                  <p className="text-xs text-amber-600">
                    Waiting for all non-recipient members to submit payment.
                  </p>
                ) : null}

                {activeCycle?.status === "READY" ? (
                  <p className="text-xs text-blue-600">
                    All payments submitted. Owner can now complete the cycle.
                  </p>
                ) : null}

                {activeCycle?.status === "COMPLETED" ? (
                  <p className="text-xs text-emerald-600">
                    This monthly cycle has been completed.
                  </p>
                ) : null}
              </div>
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-lg font-bold">Cycle Payments</h2>
              <p className="mt-1 text-sm text-slate-500">Payment records for the active cycle</p>

              <div className="mt-4 space-y-3">
                {activeCyclePayments.length === 0 ? (
                  <p className="text-sm text-slate-500">No payment records yet.</p>
                ) : (
                  activeCyclePayments.map((p) => {
                    const payer = members.find((m) => m.user_auth_id === p.payer_user_id);
                    const payee = members.find((m) => m.user_auth_id === p.payee_user_id);

                    return (
                      <div
                        key={p.id}
                        className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                      >
                        <p className="text-sm font-semibold">
                          {payer?.name || payer?.email || p.payer_user_id} → {payee?.name || payee?.email || p.payee_user_id}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Amount: ${p.amount} · Method: {p.payment_method} · Status: {p.payment_status}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}