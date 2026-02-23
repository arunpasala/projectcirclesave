"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import TopNav from "../components/TopNav";
import { getToken } from "@/lib/client-auth";

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

function Section({
  title,
  subtitle,
  open,
  onToggle,
  children,
}: {
  title: string;
  subtitle?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <button
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-4 text-left"
      >
        <div>
          <div className="text-base font-semibold">{title}</div>
          {subtitle ? <div className="mt-1 text-sm text-slate-600">{subtitle}</div> : null}
        </div>
        <div className="text-slate-500">{open ? "▾" : "▸"}</div>
      </button>

      {open && <div className="mt-4">{children}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const [token, setToken] = useState("");

  const [my, setMy] = useState<CircleRow[]>([]);
  const [all, setAll] = useState<CircleRow[]>([]);
  const [requests, setRequests] = useState<JoinReq[]>([]);
  const [notifs, setNotifs] = useState<Notif[]>([]);

  const [busyJoinId, setBusyJoinId] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [openMy, setOpenMy] = useState(true);
  const [openAll, setOpenAll] = useState(true);
  const [openReq, setOpenReq] = useState(true);
  const [openNotif, setOpenNotif] = useState(true);

  useEffect(() => {
    const t = getToken();
    if (!t) {
      window.location.href = "/login";
      return;
    }
    setToken(t);
  }, []);

  const reload = async () => {
    if (!token) return;
    setErr("");
    setMsg("");

    try {
      const [myRes, allRes, reqRes, notifRes] = await Promise.all([
        fetch("/api/circles/my", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/circles/all", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/circles/requests", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/notifications", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const myData = await myRes.json().catch(() => ({}));
      const allData = await allRes.json().catch(() => ({}));
      const reqData = await reqRes.json().catch(() => ({}));
      const nData = await notifRes.json().catch(() => ({}));

      if (!myRes.ok) throw new Error(myData?.error || "Failed to load My circles");
      if (!allRes.ok) throw new Error(allData?.error || "Failed to load All circles");
      // requests might 500 if not owner logic changes; we keep it safe
      if (!reqRes.ok) {
        setRequests([]);
      } else {
        setRequests(reqData?.requests || []);
      }
      if (!notifRes.ok) {
        setNotifs([]);
      } else {
        setNotifs(nData?.notifications || []);
      }

      setMy(myData?.circles || []);
      setAll(allData?.circles || []);
    } catch (e: any) {
      setErr(e?.message || "Something went wrong");
    }
  };

  useEffect(() => {
    if (!token) return;
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const requestedMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const r of my) m.set(r.id, r.status || "");
    return m;
  }, [my]);

  const onRequestJoin = async (circleId: number) => {
    if (!token) return;
    setBusyJoinId(circleId);
    setErr("");
    setMsg("");

    try {
      const res = await fetch("/api/circles/join", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ circleId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Join request failed");
      setMsg(data?.message || "Requested ✅");
      await reload();
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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ requestId, decision }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Decision failed");
      setMsg(`Request ${decision === "APPROVE" ? "approved ✅" : "rejected ❌"}`);
      await reload();
    } catch (e: any) {
      setErr(e?.message || "Decision failed");
    }
  };

  const markRead = async (id: number) => {
    if (!token) return;
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ notificationId: id }),
    }).catch(() => {});
    reload();
  };

  const myApproved = my.filter((x) => x.status === "APPROVED");
  const myPending = my.filter((x) => x.status === "PENDING");

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <TopNav />

      {/* login-like gradient */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[380px] bg-gradient-to-b from-blue-50 via-slate-100 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-600">
              My circles • Requests • Notifications • Explore all circles
            </p>
          </div>
          <button
            onClick={reload}
            className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>

        {err ? (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        ) : null}
        {msg ? (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {msg}
          </div>
        ) : null}

        <div className="grid gap-4">
          {/* My groups */}
          <Section
            title={`My Circles (${myApproved.length})`}
            subtitle="Circles you are already in (approved)."
            open={openMy}
            onToggle={() => setOpenMy((v) => !v)}
          >
            {myApproved.length === 0 ? (
              <div className="text-sm text-slate-600">No approved circles yet.</div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {myApproved.map((c) => (
                  <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">{c.name}</div>
                        <div className="mt-1 text-xs text-slate-600">
                          ${c.contribution_amount}/month • Circle #{c.id}
                        </div>
                      </div>
                      <Link
                        href={`/circles/${c.id}`}
                        className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                      >
                        Open
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Requested */}
          <Section
            title={`Groups Requested (${myPending.length})`}
            subtitle="Requests waiting for admin approval."
            open={openReq}
            onToggle={() => setOpenReq((v) => !v)}
          >
            {myPending.length === 0 ? (
              <div className="text-sm text-slate-600">No pending requests.</div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {myPending.map((c) => (
                  <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-sm font-semibold">{c.name}</div>
                    <div className="mt-1 text-xs text-slate-600">
                      ${c.contribution_amount}/month • Circle #{c.id}
                    </div>
                    <div className="mt-3 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      Requested (Pending)
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Notifications slide-like (simple list now) */}
          <Section
            title={`Notifications (${notifs.filter((n) => !n.is_read).length} unread)`}
            subtitle="Join approvals, join requests, account events."
            open={openNotif}
            onToggle={() => setOpenNotif((v) => !v)}
          >
            {notifs.length === 0 ? (
              <div className="text-sm text-slate-600">No notifications yet.</div>
            ) : (
              <div className="space-y-3">
                {notifs.map((n) => (
                  <div
                    key={n.id}
                    className={cls(
                      "rounded-2xl border p-4",
                      n.is_read ? "border-slate-200 bg-white" : "border-blue-200 bg-blue-50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">{n.title}</div>
                        <div className="mt-1 text-sm text-slate-700">{n.message}</div>
                        <div className="mt-2 text-xs text-slate-500">
                          {new Date(n.created_at).toLocaleString()}
                        </div>
                      </div>
                      {!n.is_read ? (
                        <button
                          onClick={() => markRead(n.id)}
                          className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
                        >
                          Mark read
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Owner pending requests */}
          <Section
            title={`Admin Requests (${requests.length})`}
            subtitle="If you own circles, approve/reject join requests here."
            open={true}
            onToggle={() => {}}
          >
            {requests.length === 0 ? (
              <div className="text-sm text-slate-600">No pending requests for your circles.</div>
            ) : (
              <div className="space-y-3">
                {requests.map((r) => (
                  <div key={r.request_id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-sm font-semibold">{r.circle_name}</div>
                    <div className="mt-1 text-sm text-slate-700">
                      Request by: <span className="font-medium">{r.requester_name || r.requester_email}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {new Date(r.requested_at).toLocaleString()}
                    </div>

                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => decide(r.request_id, "APPROVE")}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => decide(r.request_id, "REJECT")}
                        className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* All circles */}
          <Section
            title="All Circles"
            subtitle="Browse visible circles and request to join."
            open={openAll}
            onToggle={() => setOpenAll((v) => !v)}
          >
            {all.length === 0 ? (
              <div className="text-sm text-slate-600">No circles found.</div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {all.map((c) => {
                  const st = (c.my_status || "NONE") as string;
                  const isOwner = false; // optional if you want: compare owner_id to me.id using /api/me
                  const disabled = st === "PENDING" || st === "APPROVED";

                  return (
                    <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-sm font-semibold">{c.name}</div>
                      <div className="mt-1 text-xs text-slate-600">
                        ${c.contribution_amount}/month • Circle #{c.id}
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        {st === "APPROVED" ? (
                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            Member
                          </span>
                        ) : st === "PENDING" ? (
                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                            Requested
                          </span>
                        ) : st === "REJECTED" ? (
                          <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                            Rejected (can re-request)
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            Not a member
                          </span>
                        )}

                        <button
                          disabled={busyJoinId === c.id || disabled}
                          onClick={() => onRequestJoin(c.id)}
                          className={cls(
                            "rounded-2xl px-4 py-2 text-xs font-semibold shadow-sm",
                            disabled
                              ? "cursor-not-allowed bg-slate-200 text-slate-500"
                              : "bg-blue-600 text-white hover:bg-blue-700"
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

        <footer className="py-10 text-center text-xs text-slate-500">
          CircleSave • Dashboard (MVP)
        </footer>
      </div>
    </main>
  );
}