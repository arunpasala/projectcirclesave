"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type JwtPayload = {
  userId: string;
  authUserId?: string;
  email?: string;
  role?: string;
  exp?: number;
};

type AuditLog = {
  id: number;
  actor_user_id: string | null;
  actor_name: string;
  action_type: string;
  circle_id: number | null;
  target_id: number | null;
  metadata: Record<string, any> | null;
  created_at: string;
  action?: string | null;
  status?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
};

type AuditResponse = {
  logs: AuditLog[];
  summary: {
    total_logs: number;
    failed_logs: number;
    suspicious_users_count: number;
  };
  suspicious_users: {
    actor: string;
    count: number;
  }[];
  filters: {
    action_types: string[];
    circle_ids: number[];
  };
  error?: string;
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

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function statusBadge(status?: string | null) {
  const val = status || "UNKNOWN";

  if (val === "SUCCESS") {
    return (
      <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
        SUCCESS
      </span>
    );
  }

  if (val === "FAILED") {
    return (
      <span className="rounded-full bg-rose-500/15 px-3 py-1 text-xs font-semibold text-rose-300">
        FAILED
      </span>
    );
  }

  return (
    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/70">
      {val}
    </span>
  );
}

function prettyMetadata(metadata: Record<string, any> | null) {
  if (!metadata || Object.keys(metadata).length === 0) return "—";
  return JSON.stringify(metadata);
}

const glassCardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.10)",
};

export default function AdminAuditPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [token, setToken] = useState("");
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [summary, setSummary] = useState({
    total_logs: 0,
    failed_logs: 0,
    suspicious_users_count: 0,
  });
  const [suspiciousUsers, setSuspiciousUsers] = useState<
    { actor: string; count: number }[]
  >([]);
  const [actionTypes, setActionTypes] = useState<string[]>([]);
  const [circleIds, setCircleIds] = useState<number[]>([]);

  const initialCircleId = searchParams.get("circle_id") || "";

  const [statusFilter, setStatusFilter] = useState("");
  const [actionTypeFilter, setActionTypeFilter] = useState("");
  const [circleIdFilter, setCircleIdFilter] = useState(initialCircleId);

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

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (actionTypeFilter) params.set("action_type", actionTypeFilter);
    if (circleIdFilter) params.set("circle_id", circleIdFilter);
    params.set("limit", "100");
    return params.toString();
  }, [statusFilter, actionTypeFilter, circleIdFilter]);

  const loadAuditLogs = async () => {
    if (!token) return;

    setLoading(true);
    setErr("");

    try {
      const res = await fetch(`/api/admin/audit?${queryString}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const contentType = res.headers.get("content-type") || "";
      const data: AuditResponse =
        contentType.includes("application/json")
          ? await res.json()
          : ({ error: "Audit API did not return JSON." } as AuditResponse);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to load audit logs");
      }

      setLogs(data.logs || []);
      setSummary(
        data.summary || {
          total_logs: 0,
          failed_logs: 0,
          suspicious_users_count: 0,
        }
      );
      setSuspiciousUsers(data.suspicious_users || []);
      setActionTypes(data.filters?.action_types || []);
      setCircleIds(data.filters?.circle_ids || []);
    } catch (error: any) {
      setErr(error?.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loadingAuth && token) {
      loadAuditLogs();
    }
  }, [loadingAuth, token, queryString]);

  const exportAuditLogsAsCsv = () => {
    if (!logs || logs.length === 0) return;

    const headers = [
      "id",
      "actor_user_id",
      "actor_name",
      "action_type",
      "circle_id",
      "target_id",
      "status",
      "ip_address",
      "user_agent",
      "metadata",
      "created_at",
    ];

    const escapeCsv = (value: unknown) => {
      const str =
        value === null || value === undefined
          ? ""
          : typeof value === "object"
          ? JSON.stringify(value)
          : String(value);

      return `"${str.replace(/"/g, '""')}"`;
    };

    const rows = logs.map((log) => [
      log.id,
      log.actor_user_id,
      log.actor_name,
      log.action_type,
      log.circle_id,
      log.target_id,
      log.status,
      log.ip_address,
      log.user_agent,
      log.metadata,
      log.created_at,
    ]);

    const csvContent = [
      headers.map(escapeCsv).join(","),
      ...rows.map((row) => row.map(escapeCsv).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `audit-logs-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`
    );

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <main
      className="min-h-screen p-6"
      style={{
        background:
          "linear-gradient(135deg, #0f172a 0%, #134e4a 50%, #0f172a 100%)",
      }}
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-emerald-400 hover:text-emerald-300"
          >
            ← Back to Dashboard
          </Link>

          <button
            onClick={exportAuditLogsAsCsv}
            disabled={loading || logs.length === 0}
            className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Download CSV
          </button>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">Audit Dashboard</h1>
          <p className="mt-2 text-sm text-white/60">
            Review system activity, failures, and suspicious behavior.
          </p>
        </div>

        {err ? (
          <div className="mb-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {err}
          </div>
        ) : null}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-3xl p-5 text-white shadow-xl" style={glassCardStyle}>
            <p className="text-sm text-white/60">Total Logs</p>
            <p className="mt-2 text-3xl font-bold text-emerald-400">
              {summary.total_logs}
            </p>
          </div>

          <div className="rounded-3xl p-5 text-white shadow-xl" style={glassCardStyle}>
            <p className="text-sm text-white/60">Failed Actions</p>
            <p className="mt-2 text-3xl font-bold text-rose-400">
              {summary.failed_logs}
            </p>
          </div>

          <div className="rounded-3xl p-5 text-white shadow-xl" style={glassCardStyle}>
            <p className="text-sm text-white/60">Suspicious Users</p>
            <p className="mt-2 text-3xl font-bold text-amber-400">
              {summary.suspicious_users_count}
            </p>
          </div>
        </div>

        <div className="mb-6 grid gap-6 lg:grid-cols-4">
          <div
            className="rounded-3xl p-5 text-white shadow-xl lg:col-span-3"
            style={glassCardStyle}
          >
            <div className="mb-4 flex flex-wrap gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
              >
                <option value="" className="text-black">
                  All Statuses
                </option>
                <option value="SUCCESS" className="text-black">
                  SUCCESS
                </option>
                <option value="FAILED" className="text-black">
                  FAILED
                </option>
              </select>

              <select
                value={actionTypeFilter}
                onChange={(e) => setActionTypeFilter(e.target.value)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
              >
                <option value="" className="text-black">
                  All Actions
                </option>
                {actionTypes.map((type) => (
                  <option key={type} value={type} className="text-black">
                    {type}
                  </option>
                ))}
              </select>

              <select
                value={circleIdFilter}
                onChange={(e) => setCircleIdFilter(e.target.value)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
              >
                <option value="" className="text-black">
                  All Circles
                </option>
                {circleIds.map((id) => (
                  <option key={id} value={id} className="text-black">
                    Circle {id}
                  </option>
                ))}
              </select>

              <button
                onClick={() => {
                  setStatusFilter("");
                  setActionTypeFilter("");
                  setCircleIdFilter("");
                }}
                className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white"
              >
                Clear Filters
              </button>
            </div>

            <h2 className="mb-4 text-xl font-semibold">Activity Timeline</h2>

            {loading ? (
              <p className="text-sm text-white/60">Loading audit logs...</p>
            ) : logs.length === 0 ? (
              <p className="text-sm text-white/60">No audit logs found.</p>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {log.actor_name} → {log.action_type}
                        </p>
                        <p className="mt-1 text-xs text-white/50">
                          Circle: {log.circle_id ?? "—"} · Target: {log.target_id ?? "—"}
                        </p>
                      </div>

                      <div>{statusBadge(log.status)}</div>
                    </div>

                    <div className="grid gap-2 text-xs text-white/60 md:grid-cols-2">
                      <p>
                        <span className="text-white/40">Time:</span> {formatDate(log.created_at)}
                      </p>
                      <p>
                        <span className="text-white/40">IP:</span> {log.ip_address || "—"}
                      </p>
                      <p className="md:col-span-2 break-all">
                        <span className="text-white/40">User Agent:</span>{" "}
                        {log.user_agent || "—"}
                      </p>
                      <p className="md:col-span-2 break-all">
                        <span className="text-white/40">Metadata:</span>{" "}
                        {prettyMetadata(log.metadata)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            className="rounded-3xl p-5 text-white shadow-xl"
            style={glassCardStyle}
          >
            <h2 className="mb-4 text-xl font-semibold">Suspicious Activity</h2>

            {loading ? (
              <p className="text-sm text-white/60">Checking patterns...</p>
            ) : suspiciousUsers.length === 0 ? (
              <p className="text-sm text-white/60">No suspicious users detected.</p>
            ) : (
              <div className="space-y-3">
                {suspiciousUsers.map((entry, index) => (
                  <div
                    key={`${entry.actor}-${index}`}
                    className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4"
                  >
                    <p className="text-sm font-semibold text-amber-300">
                      {entry.actor}
                    </p>
                    <p className="mt-1 text-xs text-white/70">
                      {entry.count} actions in recent results
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}