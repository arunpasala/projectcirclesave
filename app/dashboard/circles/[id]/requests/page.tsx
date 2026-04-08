"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type JwtPayload = {
  userId: string;
  authUserId?: string;
  email?: string;
  role?: string;
  exp?: number;
};

type RequestRow = {
  id: number;
  circle_id: number;
  user_auth_id: string;
  role: string;
  status: string;
  requested_at?: string | null;
  joined_at?: string | null;
  decided_at?: string | null;
  circle_name?: string | null;
  requester?: {
    id: string;
    full_name?: string | null;
    email?: string | null;
  } | null;
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

function cls(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function CircleRequestsPage() {
  const router = useRouter();
  const params = useParams();
  const circleId = Number(params?.id);

  const [token, setToken] = useState("");
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [requests, setRequests] = useState<RequestRow[]>([]);
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
    setLoadingAuth(false);
  }, [router]);

  const authHeaders = useMemo(
    () => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token]
  );

  const loadRequests = async () => {
    if (!circleId || !token) return;

    setLoading(true);
    setErr("");
    setMsg("");

    try {
      const res = await fetch(`/api/circles/${circleId}/requests`, {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Failed to load requests");
      }

      setRequests(data.requests || []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load requests.");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loadingAuth && token && circleId) {
      loadRequests();
    }
  }, [loadingAuth, token, circleId]);

  const onDecide = async (
    memberUserId: string,
    action: "APPROVE" | "REJECT",
    requestId: number
  ) => {
    try {
      setBusyId(requestId);
      setErr("");
      setMsg("");

      const res = await fetch(`/api/circles/${circleId}/decide`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          memberUserId,
          action,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Failed to update request");
      }

      setMsg(data?.message || "Request updated successfully.");
      await loadRequests();
    } catch (e: any) {
      setErr(e?.message || "Failed to update request.");
    } finally {
      setBusyId(null);
    }
  };

  if (loadingAuth || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
          <p className="mt-4 text-sm text-slate-500">Loading requests…</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href={`/dashboard/circles/${circleId}`}
              className="text-sm font-medium text-emerald-700 hover:text-emerald-600"
            >
              ← Back to Circle
            </Link>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
              Join Requests
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Review and approve pending requests
            </p>
          </div>
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

        {requests.length === 0 ? (
          <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">No pending requests.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((r) => (
              <div
                key={r.id}
                className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-bold text-slate-900">
                      {r.requester?.full_name || r.requester?.email || r.user_auth_id}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {r.requester?.email || "No email"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Requested at{" "}
                      {r.requested_at
                        ? new Date(r.requested_at).toLocaleString()
                        : "—"}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => onDecide(r.user_auth_id, "APPROVE", r.id)}
                      disabled={busyId === r.id}
                      className={cls(
                        "rounded-xl px-4 py-2 text-xs font-bold text-white",
                        busyId === r.id
                          ? "bg-emerald-300"
                          : "bg-emerald-600 hover:bg-emerald-500"
                      )}
                    >
                      {busyId === r.id ? "Working..." : "Approve"}
                    </button>

                    <button
                      onClick={() => onDecide(r.user_auth_id, "REJECT", r.id)}
                      disabled={busyId === r.id}
                      className={cls(
                        "rounded-xl px-4 py-2 text-xs font-bold text-white",
                        busyId === r.id
                          ? "bg-rose-300"
                          : "bg-rose-600 hover:bg-rose-500"
                      )}
                    >
                      {busyId === r.id ? "Working..." : "Reject"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}