"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchCircleById, fetchCircleMembers, decideMember } from "@/lib/api/circles";
import { fetchContributions, addContribution } from "@/lib/api/contributions";
import { fetchCirclePayouts, schedulePayout, executePayout } from "@/lib/api/payouts";

type Circle = {
  id: number;
  name: string;
  contribution_amount: number;
  created_at: string;
  owner_auth_id: string;
};

type Member = {
  id: number;
  circle_id: number;
  user_auth_id: string;
  role: string;
  status: string;
  requested_at: string | null;
  joined_at: string | null;
  decided_at: string | null;
  profile?: {
    id: string;
    email: string | null;
    full_name: string | null;
  } | null;
};

type Contribution = {
  id: number;
  circle_id: number;
  user_auth_id: string;
  cycle_no: number;
  amount: number;
  status: string;
  paid_at: string;
  created_at: string;
};

type Payout = {
  id: number;
  circle_id: number;
  cycle_no: number;
  recipient_auth_id: string;
  selected_by_auth_id: string | null;
  method: string;
  status: string;
  amount: number;
  paid_at: string | null;
  created_at: string;
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

function Card({
  title,
  subtitle,
  children,
  right,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

export default function CircleDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const circleId = Number(params.id);

  const [userId, setUserId] = useState("");
  const [circle, setCircle] = useState<Circle | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [cycleNo, setCycleNo] = useState(1);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/auth/login");
        return;
      }

      setUserId(session.user.id);
      await loadAll();
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circleId]);

  async function loadAll() {
    try {
      setLoading(true);
      setErr("");
      setMsg("");

      const [circleRes, membersRes, contributionsRes, payoutsRes] = await Promise.all([
        fetchCircleById(circleId),
        fetchCircleMembers(circleId),
        fetchContributions(circleId),
        fetchCirclePayouts(circleId),
      ]);

      setCircle(circleRes.circle);
      setMembers(membersRes.members ?? []);
      setContributions(contributionsRes.contributions ?? []);
      setPayouts(payoutsRes.payouts ?? []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load circle.");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(memberUserId: string) {
    try {
      setBusy(true);
      setErr("");
      setMsg("");
      const res = await decideMember(circleId, memberUserId, "APPROVE");
      setMsg(res.message || "Member approved.");
      await loadAll();
    } catch (e: any) {
      setErr(e?.message || "Approve failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReject(memberUserId: string) {
    try {
      setBusy(true);
      setErr("");
      setMsg("");
      const res = await decideMember(circleId, memberUserId, "REJECT");
      setMsg(res.message || "Member rejected.");
      await loadAll();
    } catch (e: any) {
      setErr(e?.message || "Reject failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleContribute() {
    if (!circle) return;
    try {
      setBusy(true);
      setErr("");
      setMsg("");
      await addContribution({
        circle_id: circleId,
        cycle_no: cycleNo,
        amount: Number(circle.contribution_amount),
      });
      setMsg("Contribution added successfully.");
      await loadAll();
    } catch (e: any) {
      setErr(e?.message || "Contribution failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSchedulePayout() {
    try {
      setBusy(true);
      setErr("");
      setMsg("");
      await schedulePayout({
        circle_id: circleId,
        cycle_no: cycleNo,
      });
      setMsg("Payout scheduled successfully.");
      await loadAll();
    } catch (e: any) {
      setErr(e?.message || "Schedule payout failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleExecutePayout(payoutId: number) {
    try {
      setBusy(true);
      setErr("");
      setMsg("");
      await executePayout(payoutId);
      setMsg("Payout executed successfully.");
      await loadAll();
    } catch (e: any) {
      setErr(e?.message || "Execute payout failed.");
    } finally {
      setBusy(false);
    }
  }

  const pendingMembers = members.filter((m) => m.status === "PENDING");
  const approvedMembers = members.filter((m) => m.status === "APPROVED");
  const totalCollectedForCycle = contributions
    .filter((c) => c.cycle_no === cycleNo)
    .reduce((sum, c) => sum + Number(c.amount), 0);

  const isOwner = circle?.owner_auth_id === userId;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
          <p className="mt-4 text-sm text-slate-500">Loading circle...</p>
        </div>
      </div>
    );
  }

  if (!circle) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-5xl rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
          <h1 className="text-2xl font-bold text-slate-900">Circle not found</h1>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <nav className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
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

          <button
            onClick={loadAll}
            disabled={busy}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>
      </nav>

      <div className="pointer-events-none fixed inset-x-0 top-0 h-96 bg-gradient-to-b from-emerald-50/60 via-slate-50 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Badge color="emerald">Circle #{circle.id}</Badge>
                {isOwner ? <Badge color="amber">Owner</Badge> : <Badge color="blue">Member</Badge>}
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight">{circle.name}</h1>
              <p className="mt-1 text-sm text-slate-500">
                Contribution amount: ${circle.contribution_amount}
              </p>
            </div>

            <div className="grid min-w-[220px] grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <p className="text-xs font-medium text-slate-500">Approved Members</p>
                <p className="mt-1 text-2xl font-extrabold text-emerald-600">
                  {approvedMembers.length}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <p className="text-xs font-medium text-slate-500">Pending Requests</p>
                <p className="mt-1 text-2xl font-extrabold text-blue-600">
                  {pendingMembers.length}
                </p>
              </div>
            </div>
          </div>
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

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-medium text-slate-500">Current Cycle</p>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                value={cycleNo}
                onChange={(e) => setCycleNo(Number(e.target.value))}
                className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-0"
              />
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-medium text-slate-500">Collected This Cycle</p>
            <p className="mt-1 text-2xl font-extrabold text-emerald-600">
              ${totalCollectedForCycle}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-medium text-slate-500">Total Contributions</p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900">
              {contributions.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-medium text-slate-500">Total Payouts</p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900">{payouts.length}</p>
          </div>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <button
            onClick={handleContribute}
            disabled={busy}
            className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
          >
            Add Contribution
          </button>

          <button
            onClick={handleSchedulePayout}
            disabled={busy || !isOwner}
            className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
          >
            Schedule Payout
          </button>

          <Link
            href="/dashboard"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Back to Dashboard
          </Link>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card
            title="Pending Member Requests"
            subtitle="Approve or reject join requests"
            right={<Badge color="blue">{pendingMembers.length}</Badge>}
          >
            <div className="space-y-3">
              {pendingMembers.length === 0 ? (
                <p className="text-sm text-slate-500">No pending requests.</p>
              ) : (
                pendingMembers.map((member) => (
                  <div
                    key={member.id}
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">
                          {member.profile?.full_name ||
                            member.profile?.email ||
                            member.user_auth_id}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Requested:{" "}
                          {member.requested_at
                            ? new Date(member.requested_at).toLocaleString()
                            : "—"}
                        </p>
                      </div>

                      {isOwner ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(member.user_auth_id)}
                            disabled={busy}
                            className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(member.user_auth_id)}
                            disabled={busy}
                            className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <Badge color="slate">Owner only</Badge>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card
            title="Members"
            subtitle="All members in this circle"
            right={<Badge color="emerald">{members.length}</Badge>}
          >
            <div className="space-y-3">
              {members.length === 0 ? (
                <p className="text-sm text-slate-500">No members yet.</p>
              ) : (
                members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-4 ring-1 ring-slate-100"
                  >
                    <div>
                      <p className="text-sm font-semibold">
                        {member.profile?.full_name ||
                          member.profile?.email ||
                          member.user_auth_id}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {member.joined_at
                          ? `Joined ${new Date(member.joined_at).toLocaleDateString()}`
                          : "Not joined yet"}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Badge color={member.role === "OWNER" ? "amber" : "slate"}>
                        {member.role}
                      </Badge>
                      <Badge
                        color={
                          member.status === "APPROVED"
                            ? "emerald"
                            : member.status === "PENDING"
                              ? "blue"
                              : "rose"
                        }
                      >
                        {member.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card
            title="Contributions"
            subtitle="Member payments across cycles"
            right={<Badge color="emerald">{contributions.length}</Badge>}
          >
            <div className="space-y-3">
              {contributions.length === 0 ? (
                <p className="text-sm text-slate-500">No contributions yet.</p>
              ) : (
                contributions.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <div>
                      <p className="text-sm font-semibold">Cycle {item.cycle_no}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Paid: {new Date(item.paid_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-700">${item.amount}</p>
                      <div className="mt-1">
                        <Badge color="emerald">{item.status}</Badge>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card
            title="Payouts"
            subtitle="Scheduled and completed payouts"
            right={<Badge color="amber">{payouts.length}</Badge>}
          >
            <div className="space-y-3">
              {payouts.length === 0 ? (
                <p className="text-sm text-slate-500">No payouts yet.</p>
              ) : (
                payouts.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">Cycle {item.cycle_no}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Recipient ID: {item.recipient_auth_id}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Method: {item.method}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900">${item.amount}</p>
                        <div className="mt-1">
                          <Badge color={item.status === "PAID" ? "emerald" : "blue"}>
                            {item.status}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {item.status !== "PAID" && isOwner ? (
                      <button
                        onClick={() => handleExecutePayout(item.id)}
                        disabled={busy}
                        className="mt-3 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
                      >
                        Execute Payout
                      </button>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}