"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  DashboardShell,
  Section,
  GlassCard,
  Badge,
} from "@/components/ui/dashboard-shell";

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

const glassBtn = {
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.15)",
  backdropFilter: "blur(8px)",
  color: "white",
};

const approveBtn = {
  background: "rgba(16,185,129,0.85)",
  border: "1px solid rgba(16,185,129,0.4)",
  color: "white",
};

const rejectBtn = {
  background: "rgba(244,63,94,0.85)",
  border: "1px solid rgba(244,63,94,0.4)",
  color: "white",
};

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
      <div className="flex min-h-screen items-center justify-center bg-black">
        <p className="text-white/60">Loading requests...</p>
      </div>
    );
  }

  return (
    <DashboardShell
      title="Join Requests"
      subtitle="Review and approve pending members"
      userLabel="Arun"
      actions={
        <Link
          href={`/dashboard/circles/${circleId}`}
          className="rounded-xl px-3 py-2 text-xs"
          style={glassBtn}
        >
          ← Back
        </Link>
      }
    >
      {err && (
        <div className="mb-4 text-rose-300 text-sm">{err}</div>
      )}

      {msg && (
        <div className="mb-4 text-emerald-300 text-sm">{msg}</div>
      )}

      <Section title="Requests" count={requests.length}>
        {requests.length === 0 ? (
          <GlassCard>
            <p className="text-white/50 text-sm">No pending requests</p>
          </GlassCard>
        ) : (
          <div className="space-y-4">
            {requests.map((r) => (
              <GlassCard key={r.id}>
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <p className="text-white font-bold">
                      {r.requester?.full_name ||
                        r.requester?.email ||
                        r.user_auth_id}
                    </p>
                    <p className="text-white/50 text-sm">
                      {r.requester?.email || "No email"}
                    </p>
                    <p className="text-white/40 text-xs">
                      Requested{" "}
                      {r.requested_at
                        ? new Date(r.requested_at).toLocaleString()
                        : "—"}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        onDecide(r.user_auth_id, "APPROVE", r.id)
                      }
                      disabled={busyId === r.id}
                      className="rounded-xl px-4 py-2 text-xs font-bold"
                      style={approveBtn}
                    >
                      {busyId === r.id ? "..." : "Approve"}
                    </button>

                    <button
                      onClick={() =>
                        onDecide(r.user_auth_id, "REJECT", r.id)
                      }
                      disabled={busyId === r.id}
                      className="rounded-xl px-4 py-2 text-xs font-bold"
                      style={rejectBtn}
                    >
                      {busyId === r.id ? "..." : "Reject"}
                    </button>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </Section>
    </DashboardShell>
  );
}