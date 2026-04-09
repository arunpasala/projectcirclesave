"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  DashboardShell,
  Section,
  GlassCard,
  Badge,
} from "@/components/ui/dashboard-shell";

type CircleRow = {
  id: number;
  name: string;
  contribution_amount: number;
  created_at: string;
  owner_auth_id: string;
  fairness_mode?: "JOIN_ORDER" | "RANDOM_FIXED";
  isOwner?: boolean;
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
  status: "PENDING" | "OPEN" | "READY" | "PAID";
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
  recipient_confirmed?: boolean;
  recipient_confirmed_at?: string | null;
  recipient_confirmed_by?: string | null;
};

type CircleDetailsResponse = {
  circle?: CircleRow;
  members?: MemberRow[];
  payoutSchedule?: ScheduleRow[];
  cycles?: CycleRow[];
  cyclePayments?: CyclePaymentRow[];
  error?: string;
};

type JwtPayload = {
  userId: string;
  authUserId?: string;
  email?: string;
  role?: string;
  exp?: number;
};

type MeResponse = {
  id: number | string;
  email: string;
  full_name: string;
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

function statusBadge(status: string) {
  if (status === "READY") return <Badge color="blue">READY TO COMPLETE</Badge>;
  if (status === "PAID") return <Badge color="emerald">PAID</Badge>;
  if (status === "APPROVED") return <Badge color="emerald">APPROVED</Badge>;
  if (status === "PENDING") return <Badge color="amber">PENDING</Badge>;
  if (status === "REJECTED") return <Badge color="rose">REJECTED</Badge>;
  if (status === "OPEN") return <Badge color="amber">OPEN</Badge>;
  if (status === "COMPLETED") return <Badge color="emerald">COMPLETED</Badge>;
  if (status === "SUBMITTED") return <Badge color="blue">SENT</Badge>;
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
  if (message.includes("already active")) {
    return "A monthly cycle is already active for this circle.";
  }
  if (message.includes("At least two approved members")) {
    return "You need at least two approved members before opening a cycle.";
  }
  if (message.includes("No eligible payers")) {
    return "No eligible payers were found for this cycle.";
  }
  if (message.includes("Recipient does not need to submit payment")) {
    return "You are the recipient for this cycle, so you do not need to send a payment.";
  }
  if (message.includes("Only the recipient can confirm payment receipt")) {
    return "Only the recipient for this cycle can confirm receipt.";
  }
  if (message.includes("Only the circle owner can complete the cycle")) {
    return "Only the circle owner can complete the cycle.";
  }
  if (message.includes("All payments must be confirmed")) {
    return "The recipient must confirm all incoming payments before the owner can complete the cycle.";
  }
  return message;
}

const glassBtnBase: React.CSSProperties = {
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.15)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  color: "rgba(255,255,255,0.85)",
  transition: "all 0.2s ease",
};

const emeraldBtn: React.CSSProperties = {
  background: "rgba(16,185,129,0.85)",
  border: "1px solid rgba(16,185,129,0.4)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  color: "#fff",
  transition: "all 0.2s ease",
};

const blueBtn: React.CSSProperties = {
  background: "rgba(59,130,246,0.85)",
  border: "1px solid rgba(59,130,246,0.4)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  color: "#fff",
  transition: "all 0.2s ease",
};

export default function CircleDetailPage() {
  const params = useParams();
  const router = useRouter();

  const id = useMemo(() => {
    const raw = params?.id;
    if (!raw) return null;
    if (Array.isArray(raw)) return Number(raw[0]);
    return Number(raw);
  }, [params]);

  const [userId, setUserId] = useState("");
  const [authUserId, setAuthUserId] = useState("");
  const [token, setToken] = useState("");
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");

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
    const storedToken = localStorage.getItem("token");
    const payload = storedToken ? parseJwt(storedToken) : null;

    if (!storedToken || !payload?.userId) {
      router.replace("/auth/login");
      return;
    }

    if (payload.exp && Date.now() >= payload.exp * 1000) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.replace("/auth/login");
      return;
    }

    setToken(storedToken);
    setUserId(payload.userId);
    setAuthUserId(payload.authUserId || payload.userId);
    setLoadingAuth(false);
  }, [router]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedToken = localStorage.getItem("token");
        if (!storedToken) return;

        const res = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });

        if (!res.ok) return;

        const data: MeResponse = await res.json();
        setUserName(data.full_name || "");
        setUserEmail(data.email || "");
      } catch (error) {
        console.error("Failed to load current user:", error);
      }
    };

    loadUser();
  }, []);

  const authHeaders = useMemo(
    () => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token]
  );

  const reload = async () => {
    if (id === null || !Number.isFinite(id) || !token) return;

    setErr("");
    setMsg("");
    setLoadingData(true);

    try {
      const res = await fetch(`/api/circles/${id}`, {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const data: CircleDetailsResponse = await res
        .json()
        .catch(() => ({} as CircleDetailsResponse));

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
    if (!loadingAuth && userId && id !== null && Number.isFinite(id) && token) {
      reload();
    }
  }, [loadingAuth, userId, id, token]);

  const approvedMembers = members.filter((m) => m.status === "APPROVED");
  const memberCount = approvedMembers.length;
  const isOwner = !!circle && (circle.isOwner || circle.owner_auth_id === authUserId);

  const activeCycle = useMemo(
    () => cycles.find((c) => c.status === "OPEN" || c.status === "READY") || null,
    [cycles]
  );

  const activeCyclePayments = useMemo(() => {
    if (!activeCycle) return [];
    return cyclePayments.filter((p) => p.cycle_id === activeCycle.id);
  }, [activeCycle, cyclePayments]);

  const currentSchedule = useMemo(
    () =>
      schedule.find((row) => row.status !== "PAID") ||
      schedule[schedule.length - 1] ||
      null,
    [schedule]
  );

  const cycleRecipient = useMemo(() => {
    if (!activeCycle) return null;
    return members.find((m) => m.user_auth_id === activeCycle.recipient_user_id) || null;
  }, [activeCycle, members]);

  const isRecipient = activeCycle?.recipient_user_id === authUserId;
  const isApprovedMember = approvedMembers.some((m) => m.user_auth_id === authUserId);

  const confirmedCount = activeCyclePayments.filter(
    (p) => p.payment_status === "CONFIRMED"
  ).length;

  const submittedCount = activeCyclePayments.filter(
    (p) => p.payment_status === "SUBMITTED" || p.payment_status === "CONFIRMED"
  ).length;

  const expectedPayerCount = Math.max(memberCount - 1, 0);

  const myPayment = activeCyclePayments.find((p) => p.payer_user_id === authUserId);
  const hasSubmittedPayment =
    myPayment?.payment_status === "SUBMITTED" ||
    myPayment?.payment_status === "CONFIRMED";

  const pendingRecipientConfirmations = activeCyclePayments.filter(
    (p) => p.payment_status === "SUBMITTED"
  );

  const canGenerateSchedule = isOwner && schedule.length === 0;
  const canOpenCycle = isOwner && !activeCycle && schedule.length > 0;
  const canSubmitPayment =
    !!activeCycle &&
    activeCycle.status === "OPEN" &&
    isApprovedMember &&
    !isRecipient &&
    !hasSubmittedPayment;

  const canCompleteCycle =
    isOwner && !!activeCycle && activeCycle.status === "READY";

  const onGenerateSchedule = async () => {
    if (id === null || !token) return;

    try {
      setBusy(true);
      setErr("");
      setMsg("");

      const res = await fetch(`/api/payouts/schedule`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ circle_id: id }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data?.error || "Failed to generate payout schedule");

      setMsg(data?.message || "Payout schedule generated.");
      await reload();
    } catch (e: any) {
      setErr(toReadableError(e?.message || "Failed to generate payout schedule."));
    } finally {
      setBusy(false);
    }
  };

  const onOpenCycle = async () => {
    if (id === null || !token) return;

    try {
      setBusy(true);
      setErr("");
      setMsg("");

      const res = await fetch("/api/cycles/open", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ circle_id: id }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data?.error || data?.message || `Failed to open monthly cycle (HTTP ${res.status}).`
        );
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
    if (!activeCycle || !token) return;

    try {
      setBusy(true);
      setErr("");
      setMsg("");

      const res = await fetch(`/api/cycles/${activeCycle.id}/pay`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          payment_method: paymentMethod,
          transfer_reference: transferReference,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data?.error || "Failed to submit payment");

      setMsg(data?.message || "Payment submitted successfully.");
      setTransferReference("");
      await reload();
    } catch (e: any) {
      setErr(toReadableError(e?.message || "Failed to submit payment."));
    } finally {
      setBusy(false);
    }
  };

  const onConfirmReceipt = async (paymentId: number) => {
    if (!activeCycle || !token) return;

    try {
      setBusy(true);
      setErr("");
      setMsg("");

      const res = await fetch(`/api/cycles/${activeCycle.id}/confirm-receipt`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ payment_id: paymentId }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data?.error || "Failed to confirm payment receipt");

      setMsg(data?.message || "Payment receipt confirmed.");
      await reload();
    } catch (e: any) {
      setErr(toReadableError(e?.message || "Failed to confirm payment receipt."));
    } finally {
      setBusy(false);
    }
  };

  const onCompleteCycle = async () => {
    if (!activeCycle || !token) return;

    try {
      setBusy(true);
      setErr("");
      setMsg("");

      const res = await fetch(`/api/cycles/${activeCycle.id}/complete`, {
        method: "POST",
        headers: authHeaders,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data?.error || "Failed to complete cycle");

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
      <div
        className="flex min-h-screen items-center justify-center"
        style={{
          background:
            "linear-gradient(135deg, #0f172a 0%, #134e4a 50%, #0f172a 100%)",
        }}
      >
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-emerald-800 border-t-emerald-400" />
          <p className="mt-4 text-sm text-white/50">Loading circle…</p>
        </div>
      </div>
    );
  }

  if (!circle) {
    return (
      <DashboardShell
        title="Circle not found"
        subtitle="The circle may not exist or you may not have access"
        userLabel={userName || userEmail || "User"}
      >
        <GlassCard>
          <p className="text-sm text-rose-300">
            {err || "Circle not found or access denied."}
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block rounded-xl px-4 py-2 text-sm font-semibold"
            style={glassBtnBase}
          >
            Back to Dashboard
          </Link>
        </GlassCard>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title={circle.name}
      subtitle={`$${circle.contribution_amount}/month · Circle #${circle.id}`}
      userLabel={userName || userEmail || "User"}
      actions={
        <button
          onClick={reload}
          disabled={busy}
          className="rounded-xl px-3 py-2 text-xs font-semibold disabled:opacity-50"
          style={glassBtnBase}
        >
          Refresh
        </button>
      }
    >
      <div className="mb-4">
        <Link
          href="/dashboard/circles"
          className="text-sm font-medium text-emerald-400 hover:text-emerald-300"
        >
          ← Back to Circles
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge color="slate">
          Fairness Mode:{" "}
          {circle.fairness_mode === "RANDOM_FIXED"
            ? "Randomized Fixed Rotation"
            : "Join Order"}
        </Badge>
        {isOwner ? <Badge color="emerald">Owner</Badge> : null}
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
          {err}
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
          {msg}
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <GlassCard>
          <p className="text-xs font-medium text-white/50">Approved Members</p>
          <p className="mt-1 text-2xl font-extrabold text-emerald-400">{memberCount}</p>
        </GlassCard>

        <GlassCard>
          <p className="text-xs font-medium text-white/50">Current Cycle</p>
          <p className="mt-1 text-2xl font-extrabold text-blue-400">
            {activeCycle?.cycle_no || currentSchedule?.cycle_no || 1}
          </p>
        </GlassCard>

        <GlassCard>
          <p className="text-xs font-medium text-white/50">Sent / Confirmed</p>
          <p className="mt-1 text-2xl font-extrabold text-amber-400">
            {submittedCount}/{expectedPayerCount}
          </p>
          <p className="mt-1 text-xs text-white/45">{confirmedCount} confirmed</p>
        </GlassCard>

        <GlassCard>
          <p className="text-xs font-medium text-white/50">Cycle Status</p>
          <div className="mt-2">
            {activeCycle ? statusBadge(activeCycle.status) : <Badge color="slate">NO CYCLE</Badge>}
          </div>
        </GlassCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section
            title="Payout Schedule"
            subtitle="Transparent order with cycle status tracking"
          >
            <div className="mb-4 flex flex-wrap gap-2">
              {canGenerateSchedule ? (
                <button
                  onClick={onGenerateSchedule}
                  disabled={busy}
                  className="rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-50"
                  style={emeraldBtn}
                >
                  Generate Schedule
                </button>
              ) : null}

              {isOwner ? (
                <button
                  onClick={onOpenCycle}
                  disabled={busy || !canOpenCycle}
                  className="rounded-xl px-4 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50"
                  style={canOpenCycle ? blueBtn : glassBtnBase}
                >
                  Open Monthly Cycle
                </button>
              ) : null}
            </div>

            {schedule.length === 0 ? (
              <p className="mt-4 text-sm text-white/50">No payout schedule yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {schedule.map((row) => (
                  <div
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">Cycle {row.cycle_no}</p>
                      <p className="mt-0.5 text-sm text-white/60">
                        Recipient: {row.recipient_name || row.recipient_email || row.recipient_user_id}
                      </p>
                    </div>
                    <div>{statusBadge(row.status)}</div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section
            title="Members"
            subtitle="Approved and pending members in this circle"
          >
            <div className="mb-4">
              <Link
                href={`/dashboard/circles/${circle.id}/requests`}
                className="inline-block rounded-xl px-4 py-2 text-xs font-semibold"
                style={glassBtnBase}
              >
                Manage Requests
              </Link>
            </div>

            <div className="space-y-3">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full font-semibold text-white"
                      style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)" }}
                    >
                      {getInitial(m.name, m.email)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {m.name || m.email || m.user_auth_id || "Unknown User"}
                      </p>
                      <p className="mt-0.5 text-xs text-white/50">Role: {m.role}</p>
                    </div>
                  </div>
                  <div>{statusBadge(m.status)}</div>
                </div>
              ))}
            </div>
          </Section>

          {activeCycle ? (
            <Section
              title="Cycle Payments"
              subtitle="Professional payment workflow with recipient confirmation"
            >
              <div className="space-y-3">
                {activeCyclePayments.length === 0 ? (
                  <p className="text-sm text-white/50">No payment records yet.</p>
                ) : (
                  activeCyclePayments.map((p) => {
                    const payer = members.find((m) => m.user_auth_id === p.payer_user_id);
                    const payee = members.find((m) => m.user_auth_id === p.payee_user_id);

                    return (
                      <div
                        key={p.id}
                        className="rounded-2xl p-4"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {payer?.name || payer?.email || p.payer_user_id} →{" "}
                              {payee?.name || payee?.email || p.payee_user_id}
                            </p>
                            <p className="mt-1 text-xs text-white/50">
                              Amount: ${p.amount} · Method: {p.payment_method}
                              {p.transfer_reference ? ` · Ref: ${p.transfer_reference}` : ""}
                            </p>
                          </div>
                          <div>{statusBadge(p.payment_status)}</div>
                        </div>

                        {isRecipient && p.payment_status === "SUBMITTED" ? (
                          <div className="mt-3">
                            <button
                              onClick={() => onConfirmReceipt(p.id)}
                              disabled={busy}
                              className="rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-50"
                              style={emeraldBtn}
                            >
                              Confirm Receipt
                            </button>
                          </div>
                        ) : null}

                        {p.payment_status === "CONFIRMED" ? (
                          <p className="mt-3 text-xs text-emerald-300">Confirmed by recipient.</p>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </Section>
          ) : null}
        </div>

        <div className="space-y-6">
          <Section
            title="Current Cycle Action"
            subtitle="Clear actions based on your role in this cycle"
          >
            <div className="space-y-4">
              <div
                className="rounded-2xl p-4"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <p className="text-xs font-medium text-white/50">Cycle Recipient</p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {cycleRecipient?.name ||
                    cycleRecipient?.email ||
                    activeCycle?.recipient_user_id ||
                    "—"}
                </p>
              </div>

              <div
                className="rounded-2xl p-4"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <p className="text-xs font-medium text-white/50">Contribution Amount</p>
                <p className="mt-1 text-sm font-semibold text-white">
                  ${activeCycle?.amount_per_member || circle.contribution_amount}
                </p>
              </div>

              <div
                className="rounded-2xl p-4"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <p className="text-xs font-medium text-white/50">Progress</p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {submittedCount} of {expectedPayerCount} sent
                </p>
                <p className="mt-1 text-xs text-white/50">
                  {confirmedCount} of {expectedPayerCount} confirmed by recipient
                </p>
              </div>

              {canSubmitPayment ? (
                <>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                  >
                    <option value="CASH" className="text-black">Cash</option>
                    <option value="BANK_TRANSFER" className="text-black">Bank Transfer</option>
                  </select>

                  <input
                    type="text"
                    placeholder="Transfer reference (optional)"
                    value={transferReference}
                    onChange={(e) => setTransferReference(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
                  />

                  <button
                    onClick={onSubmitPayment}
                    disabled={busy}
                    className="w-full rounded-2xl px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    style={emeraldBtn}
                  >
                    Mark Payment Sent
                  </button>
                </>
              ) : null}

              {isRecipient && activeCycle ? (
                <div
                  className="rounded-2xl p-4"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <p className="text-sm font-semibold text-white">Recipient confirmation</p>
                  <p className="mt-1 text-xs text-white/50">
                    Confirm each payment after you actually receive it.
                  </p>
                </div>
              ) : null}

              {canCompleteCycle ? (
                <button
                  onClick={onCompleteCycle}
                  disabled={busy}
                  className="w-full rounded-2xl px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  style={blueBtn}
                >
                  Complete Cycle
                </button>
              ) : null}

              {!activeCycle ? (
                <p className="text-xs text-white/50">No monthly cycle is active yet.</p>
              ) : null}

              {activeCycle?.status === "OPEN" && !isRecipient && hasSubmittedPayment ? (
                <p className="text-xs text-blue-300">
                  Your payment was sent. Waiting for recipient confirmation.
                </p>
              ) : null}

              {activeCycle?.status === "OPEN" && isRecipient && pendingRecipientConfirmations.length > 0 ? (
                <p className="text-xs text-amber-300">
                  Please confirm receipt for submitted payments.
                </p>
              ) : null}

              {activeCycle?.status === "READY" ? (
                <p className="text-xs text-blue-300">
                  All payments are confirmed. The owner can now complete this cycle.
                </p>
              ) : null}

              {isRecipient && activeCycle?.status === "OPEN" && pendingRecipientConfirmations.length === 0 ? (
                <p className="text-xs text-white/50">
                  No submitted payments are waiting for your confirmation.
                </p>
              ) : null}

              {isOwner && activeCycle?.status === "OPEN" ? (
                <p className="text-xs text-white/50">
                  The owner must wait until the recipient confirms all payments.
                </p>
              ) : null}
            </div>
          </Section>
        </div>
      </div>
    </DashboardShell>
  );
}