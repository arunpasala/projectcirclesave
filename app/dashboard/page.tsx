"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  fetchMyCircles,
  fetchAllCircles,
  fetchCircleRequests,
  decideMember,
} from "@/lib/api/circles";
import {
  fetchNotifications,
  markNotificationRead,
} from "@/lib/api/notifications";

type CircleRow = {
  id: number;
  name: string;
  contribution_amount: number;
  created_at: string;
  owner_auth_id: string;
  membership_role?: string | null;
  membership_status?: string | null;
  joined_at?: string | null;
};

type RequestRow = {
  id: number;
  circle_id: number;
  user_auth_id: string;
  role: string;
  status: string;
  requested_at: string | null;
  joined_at?: string | null;
  decided_at?: string | null;
  circle_name?: string | null;
  requester?: {
    id: string;
    email: string | null;
    full_name: string | null;
  } | null;
};

type NotificationRow = {
  id: number;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  type?: string | null;
  meta?: Record<string, unknown> | null;
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

function Section({
  title,
  subtitle,
  count,
  open,
  onToggle,
  children,
}: {
  title: string;
  subtitle?: string;
  count?: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition hover:bg-slate-50"
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900">{title}</span>
            {count !== undefined ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                {count}
              </span>
            ) : null}
          </div>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
          ) : null}
        </div>
        <span className="text-slate-400">{open ? "▾" : "▸"}</span>
      </button>

      {open ? (
        <div className="border-t border-slate-100 px-6 py-5">{children}</div>
      ) : null}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");

  const [myCircles, setMyCircles] = useState<CircleRow[]>([]);
  const [allCircles, setAllCircles] = useState<CircleRow[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [pendingMine, setPendingMine] = useState<RequestRow[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);

  const [authChecking, setAuthChecking] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [busyJoinId, setBusyJoinId] = useState<number | null>(null);
  const [busyDecisionId, setBusyDecisionId] = useState<number | null>(null);
  const [busyNotificationId, setBusyNotificationId] = useState<number | null>(
    null
  );

  const [openMy, setOpenMy] = useState(true);
  const [openAll, setOpenAll] = useState(true);
  const [openReq, setOpenReq] = useState(true);
  const [openNotif, setOpenNotif] = useState(true);
  const [openAdmin, setOpenAdmin] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error || !session) {
          router.replace("/auth/login");
          return;
        }

        setUserId(session.user.id);
        setUserEmail(session.user.email || "");
        setUserName(session.user.user_metadata?.full_name || "");
      } catch {
        router.replace("/auth/login");
      } finally {
        setAuthChecking(false);
      }
    };

    init();
  }, [router, supabase]);

  const reload = async (showLoader = true) => {
    setErr("");
    setMsg("");
    if (showLoader) setDataLoading(true);

    try {
      const [myRes, allRes, reqRes, notifRes] = await Promise.all([
        fetchMyCircles(),
        fetchAllCircles(),
        fetchCircleRequests(),
        fetchNotifications(),
      ]);

      setMyCircles(myRes.circles || []);
      setAllCircles(allRes.circles || []);
      setRequests(reqRes.requests || []);
      setPendingMine(reqRes.pendingMine || []);
      setNotifications(notifRes.notifications || []);
    } catch (e: any) {
      setErr(e?.message || "Something went wrong loading your dashboard.");
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (!authChecking && userId) {
      reload();
    }
  }, [authChecking, userId]);

  const onRequestJoin = async (circleId: number) => {
    try {
      setBusyJoinId(circleId);
      setErr("");
      setMsg("");

      const res = await fetch("/api/circles/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ circle_id: circleId }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Join request failed");
      }

      const circle = allCircles.find((c) => c.id === circleId);
      if (circle) {
        setPendingMine((prev) => {
          const exists = prev.some((p) => p.circle_id === circleId);
          if (exists) return prev;

          return [
            {
              id: Date.now(),
              circle_id: circleId,
              user_auth_id: userId,
              role: "MEMBER",
              status: "PENDING",
              requested_at: new Date().toISOString(),
              circle_name: circle.name,
            } as RequestRow,
            ...prev,
          ];
        });
      }

      setMsg(data?.message || "Join request submitted.");
      await reload(false);
    } catch (e: any) {
      setErr(e?.message || "Join request failed.");
    } finally {
      setBusyJoinId(null);
    }
  };

  const onDecide = async (
    circleId: number,
    memberUserId: string,
    action: "APPROVE" | "REJECT",
    requestId: number
  ) => {
    try {
      setBusyDecisionId(requestId);
      setErr("");
      setMsg("");

      const result = await decideMember(circleId, memberUserId, action);
      setMsg(
        result.message ||
          (action === "APPROVE" ? "Member approved." : "Member rejected.")
      );
      await reload(false);
    } catch (e: any) {
      setErr(e?.message || "Decision failed.");
    } finally {
      setBusyDecisionId(null);
    }
  };

  const onMarkRead = async (id: number) => {
    try {
      setBusyNotificationId(id);
      await markNotificationRead(id);
      await reload(false);
    } catch (e: any) {
      setErr(e?.message || "Failed to mark notification as read.");
    } finally {
      setBusyNotificationId(null);
    }
  };

  const onSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/auth/login");
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const visibleAllCircles = allCircles.map((circle) => {
    const mineApproved = myCircles.find((m) => m.id === circle.id);
    const minePending = pendingMine.find((p) => p.circle_id === circle.id);

    let myStatus: "APPROVED" | "PENDING" | "NONE" = "NONE";
    if (mineApproved) myStatus = "APPROVED";
    else if (minePending) myStatus = "PENDING";

    return {
      ...circle,
      my_status: myStatus,
    };
  });

  if (authChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
          <p className="mt-4 text-sm text-slate-500">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <nav className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-600 text-sm font-black text-white">
              C
            </div>
            <span className="font-bold text-slate-900">CircleSave</span>
          </Link>

          <div className="flex items-center gap-3">
            {unreadCount > 0 ? (
              <button
                onClick={() => setOpenNotif(true)}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200"
              >
                🔔
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                  {unreadCount}
                </span>
              </button>
            ) : null}

            <div className="hidden items-center gap-2 rounded-xl bg-slate-100 px-3 py-1.5 sm:flex">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-600 text-xs font-bold text-white">
                {(userName || userEmail || "U").charAt(0).toUpperCase()}
              </div>
              <span className="max-w-[140px] truncate text-xs font-semibold text-slate-700">
                {userName || userEmail}
              </span>
            </div>

            <Link
              href="/circles/create"
              className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-500"
            >
              + New Circle
            </Link>

            <button
              onClick={onSignOut}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <div className="pointer-events-none fixed inset-x-0 top-0 h-96 bg-gradient-to-b from-emerald-50/60 via-slate-50 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">
              Welcome back
              {userName ? (
                <span className="font-semibold text-slate-700"> {userName}</span>
              ) : null}{" "}
              · Manage your savings circles
            </p>
          </div>

          <button
            onClick={() => reload()}
            disabled={dataLoading}
            className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            {dataLoading ? "Loading…" : "↻ Refresh"}
          </button>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: "My Groups",
              value: myCircles.length,
              color: "text-emerald-600",
            },
            {
              label: "Requested",
              value: pendingMine.length,
              color: "text-blue-600",
            },
            {
              label: "Admin Requests",
              value: requests.length,
              color: "text-amber-600",
            },
            {
              label: "Unread Notifs",
              value: unreadCount,
              color: "text-rose-600",
            },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
            >
              <p className="text-xs font-medium text-slate-500">{label}</p>
              <p className={cls("mt-1 text-2xl font-extrabold", color)}>{value}</p>
            </div>
          ))}
        </div>

        {dataLoading ? (
          <div className="mb-4 overflow-hidden rounded-full bg-slate-200">
            <div className="h-1 w-[60%] animate-pulse rounded-full bg-emerald-500" />
          </div>
        ) : null}

        {err ? (
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            ⚠ {err}
          </div>
        ) : null}

        {msg ? (
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            ✓ {msg}
          </div>
        ) : null}

        <div className="grid gap-4">
          <Section
            title="My Groups"
            subtitle="Circles you are an approved member of"
            count={myCircles.length}
            open={openMy}
            onToggle={() => setOpenMy((v) => !v)}
          >
            {myCircles.length === 0 ? (
              <p className="text-sm text-slate-500">
                No approved circles yet. Request to join one below.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {myCircles.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <div>
                      <p className="text-sm font-semibold">{c.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        ${c.contribution_amount}/month · Circle #{c.id}
                      </p>
                      <div className="mt-1">
                        <Badge color="emerald">Approved</Badge>
                      </div>
                    </div>

                    <Link
                      href={`/circles/${c.id}`}
                      className="shrink-0 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
                    >
                      Open →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section
            title="Requested Groups"
            subtitle="Your join requests awaiting approval"
            count={pendingMine.length}
            open={openReq}
            onToggle={() => setOpenReq((v) => !v)}
          >
            {pendingMine.length === 0 ? (
              <p className="text-sm text-slate-500">No pending requests.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {pendingMine.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4"
                  >
                    <p className="text-sm font-semibold">
                      {c.circle_name || `Circle #${c.circle_id}`}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Requested at{" "}
                      {c.requested_at
                        ? new Date(c.requested_at).toLocaleString()
                        : "—"}
                    </p>
                    <div className="mt-2">
                      <Badge color="blue">Requested</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section
            title="Notifications"
            subtitle="Approvals, requests, and account events"
            count={unreadCount}
            open={openNotif}
            onToggle={() => setOpenNotif((v) => !v)}
          >
            {notifications.length === 0 ? (
              <p className="text-sm text-slate-500">No notifications yet.</p>
            ) : (
              <div className="space-y-3">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={cls(
                      "rounded-2xl border p-4",
                      n.read
                        ? "border-slate-100 bg-slate-50"
                        : "border-emerald-200 bg-emerald-50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{n.title}</p>
                        <p className="mt-1 text-sm text-slate-600">{n.message}</p>
                        <p className="mt-2 text-xs text-slate-400">
                          {new Date(n.created_at).toLocaleString()}
                        </p>
                      </div>

                      {!n.read ? (
                        <button
                          onClick={() => onMarkRead(n.id)}
                          disabled={busyNotificationId === n.id}
                          className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                        >
                          {busyNotificationId === n.id ? "..." : "Mark read"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section
            title="Admin Requests"
            subtitle="Approve or reject join requests for circles you own"
            count={requests.length}
            open={openAdmin}
            onToggle={() => setOpenAdmin((v) => !v)}
          >
            {requests.length === 0 ? (
              <p className="text-sm text-slate-500">
                No pending requests for your circles.
              </p>
            ) : (
              <div className="space-y-3">
                {requests.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-2xl border border-slate-100 bg-white p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">
                          {r.circle_name || `Circle #${r.circle_id}`}
                        </p>
                        <p className="mt-0.5 text-sm text-slate-600">
                          Requested by{" "}
                          <span className="font-medium">
                            {r.requester?.full_name ||
                              r.requester?.email ||
                              r.user_auth_id}
                          </span>
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {r.requested_at
                            ? new Date(r.requested_at).toLocaleString()
                            : "—"}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            onDecide(r.circle_id, r.user_auth_id, "APPROVE", r.id)
                          }
                          disabled={busyDecisionId === r.id}
                          className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                        >
                          {busyDecisionId === r.id ? "..." : "Accept"}
                        </button>

                        <button
                          onClick={() =>
                            onDecide(r.circle_id, r.user_auth_id, "REJECT", r.id)
                          }
                          disabled={busyDecisionId === r.id}
                          className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50"
                        >
                          {busyDecisionId === r.id ? "..." : "Reject"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section
            title="All Circles"
            subtitle="Browse available circles and request to join"
            count={allCircles.length}
            open={openAll}
            onToggle={() => setOpenAll((v) => !v)}
          >
            {visibleAllCircles.length === 0 ? (
              <p className="text-sm text-slate-500">
                {dataLoading ? "Loading circles…" : "No circles found."}
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {visibleAllCircles.map((c: any) => {
                  const st = c.my_status as "APPROVED" | "PENDING" | "NONE";
                  const disabled = st === "PENDING" || st === "APPROVED";

                  return (
                    <div
                      key={c.id}
                      className="rounded-2xl border border-slate-100 bg-white p-4"
                    >
                      <p className="text-sm font-semibold">{c.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        ${c.contribution_amount}/month · Circle #{c.id}
                      </p>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        {st === "APPROVED" ? (
                          <Badge color="emerald">Member</Badge>
                        ) : st === "PENDING" ? (
                          <Badge color="blue">Requested</Badge>
                        ) : (
                          <Badge color="slate">Not a member</Badge>
                        )}

                        <button
                          disabled={busyJoinId === c.id || disabled}
                          onClick={() => onRequestJoin(c.id)}
                          className={cls(
                            "rounded-xl px-4 py-2 text-xs font-bold shadow-sm transition",
                            disabled
                              ? "cursor-not-allowed bg-slate-100 text-slate-400"
                              : "bg-emerald-600 text-white hover:bg-emerald-500"
                          )}
                        >
                          {busyJoinId === c.id
                            ? "Requesting..."
                            : st === "PENDING"
                            ? "Requested"
                            : st === "APPROVED"
                            ? "Joined"
                            : "Request to Join"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>
        </div>

        <footer className="py-10 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} CircleSave · Secure savings circle platform
        </footer>
      </div>
    </main>
  );
}