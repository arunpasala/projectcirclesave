"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Circle = {
  id: number;
  name: string;
  contribution_amount: number;
  role: string;
  created_at: string;
};

export default function DashboardPage() {
  const [circles, setCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  function logout() {
    localStorage.removeItem("token");
    router.push("/login");
  }

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetch("/api/circles/my", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Failed to load circles");
        return data;
      })
      .then((data) => {
        setCircles(data.circles || []);
        setLoading(false);
      })
      .catch((e: any) => {
        setError(e?.message || "Error");
        setLoading(false);
      });
  }, [router]);

  return (
    <div style={d.page}>
      <div style={d.topbar}>
        <div style={d.brand}>
          <div style={d.logo}>C</div>
          <div>
            <div style={d.title}>CircleSave</div>
            <div style={d.subtitle}>My Circles</div>
          </div>
        </div>

        <button onClick={logout} style={d.logoutBtn}>
          Logout
        </button>
      </div>

      <div style={d.container}>
        {loading && <p style={d.muted}>Loading circles...</p>}
        {error && <div style={d.errorBox}>{error}</div>}

        {!loading && !error && circles.length === 0 && (
          <p style={d.muted}>No circles yet.</p>
        )}

        <div style={d.grid}>
          {circles.map((c) => (
            <div key={c.id} style={d.card}>
              <div style={d.cardHeader}>
                <div style={d.cardName}>{c.name}</div>
                <div style={d.badge}>{c.role}</div>
              </div>
              <div style={d.cardRow}>
                <span style={d.muted}>Contribution</span>
                <span style={d.value}>${Number(c.contribution_amount).toFixed(2)}</span>
              </div>
              <div style={d.cardRow}>
                <span style={d.muted}>Created</span>
                <span style={d.value}>
                  {new Date(c.created_at).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const d: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f0f2f5",
    fontFamily:
      'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
  },
  topbar: {
    height: 72,
    background: "#fff",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 20px",
  },
  brand: { display: "flex", alignItems: "center", gap: 12 },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 999,
    background: "#1877F2",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    fontSize: 20,
    boxShadow: "0 10px 25px rgba(24,119,242,0.18)",
  },
  title: { fontWeight: 800, color: "#111827" },
  subtitle: { fontSize: 12, color: "#6b7280", marginTop: 2 },

  logoutBtn: {
    height: 40,
    padding: "0 14px",
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    background: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },

  container: { maxWidth: 1100, margin: "0 auto", padding: 20 },
  muted: { color: "#6b7280" },

  errorBox: {
    padding: "10px 12px",
    borderRadius: 12,
    background: "#FEF2F2",
    border: "1px solid #FECACA",
    color: "#991B1B",
    fontWeight: 700,
    marginBottom: 14,
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 14,
    marginTop: 12,
  },

  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 12px 30px rgba(0,0,0,0.06)",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 12,
  },
  cardName: { fontWeight: 900, color: "#111827", fontSize: 16 },
  badge: {
    padding: "6px 10px",
    borderRadius: 999,
    background: "#EFF6FF",
    border: "1px solid #BFDBFE",
    color: "#1D4ED8",
    fontWeight: 800,
    fontSize: 12,
    textTransform: "capitalize",
  },
  cardRow: { display: "flex", justifyContent: "space-between", marginTop: 10 },
  value: { fontWeight: 800, color: "#111827" },
};
