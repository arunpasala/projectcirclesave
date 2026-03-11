"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────
type CircleRow = {
  id: number;
  owner_id: number;
  name: string;
  contribution_amount: string;
  created_at: string;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  my_status?: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
};

type JoinReq = {
  request_id: number;
  circle_id: number;
  circle_name: string;
  requester_id: number;
  requester_email: string;
  requester_name: string;
  requested_at: string;
  status: "PENDING";
};

type Notif = {
  id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
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
  color: "emerald" | "blue" | "rose" | "slate";
}) {
  const map = {
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    blue: "bg-blue-50 text-blue-700 ring-blue-200",
    rose: "bg-rose-50 text-rose-700 ring-rose-200",
    slate: "bg-slate-100 text-slate-600 ring-slate-200",
  };
  return (
    <span
      className={cls(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1",
        map[color],
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
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">{title}</span>
              {count !== undefined && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  {count}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
            )}
          </div>
        </div>
        <span className="text-slate-400">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="border-t border-slate-100 px-6 py-5">{children}</div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [token, setToken] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");

  const [my, setMy] = useState<CircleRow[]>([]);
  const [all, setAll] = useState<CircleRow[]>([]);
  const [requests, setRequests] = useState<JoinReq[]>([]);
  const [notifs, setNotifs] = useState<Notif[]>([]);

  const [busyJoinId, setBusyJoinId] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // Three distinct states: "auth" (checking session), "data" (loading API), "ready"
  const [authChecking, setAuthChecking] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);

  const [openMy, setOpenMy] = useState(true);
  const [openAll, setOpenAll] = useState(true);
  const [openReq, setOpenReq] = useState(true);
  const [openNotif, setOpenNotif] = useState(true);
  const [openAdmin, setOpenAdmin] = useState(true);

  // ── Auth check ────────────────────────────────────────────────────────────
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

        setToken(session.access_token);
        setUserEmail(session.user.email || "");
        setUserName(session.user.user_metadata?.full_name || "");
      } catch (e) {
        // If Supabase itself throws, still redirect rather than blank screen
        router.replace("/auth/login");
      } finally {
        setAuthChecking(false);
      }
    };
    init();
  }, []);

  // ── Data fetch ────────────────────────────────────────────────────────────
  const reload = async (showLoader = true) => {
    if (!token) return;
    setErr("");
    setMsg("");
    if (showLoader) setDataLoading(true);

    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [myRes, allRes, reqRes, notifRes] = await Promise.all([
        fetch("/api/circles/my", { headers }),
        fetch("/api/circles/all", { headers }),
        fetch("/api/circles/requests", { headers }),
        fetch("/api/notifications", { headers }),
      ]);

      const [myData, allData, reqData, nData] = await Promise.all([
        myRes.json().catch(() => ({})),
        allRes.json().catch(() => ({})),
        reqRes.json().catch(() => ({})),
        notifRes.json().catch(() => ({})),
      ]);

      if (!myRes.ok)
        throw new Error(myData?.error || "Failed to load My circles");
      if (!allRes.ok)
        throw new Error(allData?.error || "Failed to load All circles");

      setMy(myData?.circles || []);
      setAll(allData?.circles || []);
      setRequests(reqRes.ok ? reqData?.requests || [] : []);
      setNotifs(notifRes.ok ? nData?.notifications || [] : []);
    } catch (e: any) {
      setErr(e?.message || "Something went wrong loading your data.");
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (token) reload();
  }, [token]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const onRequestJoin = async (circleId: number) => {
    if (!token) return;
    setBusyJoinId(circleId);
    setErr("");
    setMsg("");
    try {
      const res = await fetch("/api/circles/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ circleId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Join request failed");
      setMsg(data?.message || "Join request sent ✅");
      await reload(false);
    } catch (e: any) {
      setErr(e?.message || "Join request failed");
    } finally {
      setBusyJoinId(null);
    }
  };

  const decide = async (requestId: number, decision: "APPROVE" | "REJECT") => {
    if (!token) return;
    setErr("");
    setMsg("");
    try {
      const res = await fetch("/api/circles/requests/decide", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ requestId, decision }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Decision failed");
      setMsg(
        decision === "APPROVE" ? "Request approved ✅" : "Request rejected ❌",
      );
      await reload(false);
    } catch (e: any) {
      setErr(e?.message || "Decision failed");
    }
  };

  const markRead = async (id: number) => {
    if (!token) return;
    await fetch("/api/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ notificationId: id }),
    }).catch(() => {});
    reload(false);
  };

  const onSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/auth/login");
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const myApproved = my.filter((x) => x.status === "APPROVED");
  const myPending = my.filter((x) => x.status === "PENDING");
  const unreadCount = notifs.filter((n) => !n.is_read).length;

  // ── Auth loading — show nothing until session resolved ────────────────────
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
      {/* ── Top Nav ──────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <img
              src="/assets/circlesave-logo.png"
              alt="CircleSave"
              className="h-8 w-8 rounded-xl object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                const fb = e.currentTarget
                  .nextElementSibling as HTMLElement | null;
                if (fb) fb.style.display = "grid";
              }}
            />
            <div className="hidden h-8 w-8 place-items-center rounded-xl bg-emerald-600 text-sm font-black text-white">
              C
            </div>
            <span className="font-bold text-slate-900">CircleSave</span>
          </Link>

          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={() => setOpenNotif(true)}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200"
              >
                🔔
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                  {unreadCount}
                </span>
              </button>
            )}

            <div className="hidden items-center gap-2 rounded-xl bg-slate-100 px-3 py-1.5 sm:flex">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-600 text-xs font-bold text-white">
                {(userName || userEmail).charAt(0).toUpperCase()}
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
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Welcome back
              {userName && (
                <span className="font-semibold text-slate-700">
                  {" "}
                  {userName}
                </span>
              )}{" "}
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

        {/* Stats row */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: "My Circles",
              value: myApproved.length,
              color: "text-emerald-600",
            },
            {
              label: "Pending",
              value: myPending.length,
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
              <p className={cls("mt-1 text-2xl font-extrabold", color)}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Data loading bar */}
        {dataLoading && (
          <div className="mb-4 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-1 animate-pulse rounded-full bg-emerald-500"
              style={{ width: "60%" }}
            />
          </div>
        )}

        {/* Flash messages */}
        {err && (
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            ⚠ {err}
          </div>
        )}
        {msg && (
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            ✓ {msg}
          </div>
        )}

        <div className="grid gap-4">
          {/* My Circles */}
          <Section
            title="My Circles"
            subtitle="Circles you are an approved member of"
            count={myApproved.length}
            open={openMy}
            onToggle={() => setOpenMy((v) => !v)}
          >
            {myApproved.length === 0 ? (
              <p className="text-sm text-slate-500">
                No approved circles yet. Request to join one below.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {myApproved.map((c) => (
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
                        <Badge color="emerald">Member</Badge>
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

          {/* Pending Requests */}
          <Section
            title="Pending Requests"
            subtitle="Your join requests awaiting admin approval"
            count={myPending.length}
            open={openReq}
            onToggle={() => setOpenReq((v) => !v)}
          >
            {myPending.length === 0 ? (
              <p className="text-sm text-slate-500">No pending requests.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {myPending.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4"
                  >
                    <p className="text-sm font-semibold">{c.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      ${c.contribution_amount}/month · Circle #{c.id}
                    </p>
                    <div className="mt-2">
                      <Badge color="blue">Awaiting approval</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Notifications */}
          <Section
            title="Notifications"
            subtitle="Join approvals, requests, and account events"
            count={unreadCount}
            open={openNotif}
            onToggle={() => setOpenNotif((v) => !v)}
          >
            {notifs.length === 0 ? (
              <p className="text-sm text-slate-500">No notifications yet.</p>
            ) : (
              <div className="space-y-3">
                {notifs.map((n) => (
                  <div
                    key={n.id}
                    className={cls(
                      "rounded-2xl border p-4",
                      n.is_read
                        ? "border-slate-100 bg-slate-50"
                        : "border-emerald-200 bg-emerald-50",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{n.title}</p>
                        <p className="mt-1 text-sm text-slate-600">
                          {n.message}
                        </p>
                        <p className="mt-2 text-xs text-slate-400">
                          {new Date(n.created_at).toLocaleString()}
                        </p>
                      </div>
                      {!n.is_read && (
                        <button
                          onClick={() => markRead(n.id)}
                          className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Admin Requests */}
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
                    key={r.request_id}
                    className="rounded-2xl border border-slate-100 bg-white p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{r.circle_name}</p>
                        <p className="mt-0.5 text-sm text-slate-600">
                          Requested by{" "}
                          <span className="font-medium">
                            {r.requester_name || r.requester_email}
                          </span>
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {new Date(r.requested_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => decide(r.request_id, "APPROVE")}
                          className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => decide(r.request_id, "REJECT")}
                          className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* All Circles */}
          <Section
            title="All Circles"
            subtitle="Browse available circles and request to join"
            open={openAll}
            onToggle={() => setOpenAll((v) => !v)}
          >
            {all.length === 0 ? (
              <p className="text-sm text-slate-500">
                {dataLoading ? "Loading circles…" : "No circles found."}
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {all.map((c) => {
                  const st = (c.my_status || "NONE") as string;
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
                        ) : st === "REJECTED" ? (
                          <Badge color="rose">Rejected</Badge>
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
                              : "bg-emerald-600 text-white hover:bg-emerald-500",
                          )}
                        >
                          {busyJoinId === c.id
                            ? "Requesting…"
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
          © {new Date().getFullYear()} CircleSave · OTP-secured platform
        </footer>
      </div>
    </main>
  );
}
