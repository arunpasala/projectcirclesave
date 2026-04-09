"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DashboardShell,
  Section,
  GlassCard,
  Badge,
} from "@/components/ui/dashboard-shell";

type Circle = {
  id: number;
  name: string;
  contribution_amount: number;
  created_at: string;
  membership_status?: string | null;
  joined_at?: string | null;
};

type JwtPayload = {
  userId: string;
  email?: string;
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

export default function DashboardCirclesPage() {
  const router = useRouter();

  const [circles, setCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [userLabel, setUserLabel] = useState("User");

  useEffect(() => {
    const init = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          router.replace("/auth/login");
          return;
        }

        const payload = parseJwt(token);

        if (!payload?.userId) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          router.replace("/auth/login");
          return;
        }

        if (payload.exp && Date.now() >= payload.exp * 1000) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          router.replace("/auth/login");
          return;
        }

        const [meRes, circlesRes] = await Promise.all([
          fetch("/api/auth/me", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch("/api/circles/my", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        const meData = await meRes.json().catch(() => null);
        const circlesData = await circlesRes.json().catch(() => null);

        if (!meRes.ok) {
          throw new Error(meData?.error || "Failed to load current user");
        }

        if (!circlesRes.ok) {
          throw new Error(circlesData?.error || "Failed to load circles");
        }

        const me = meData as MeResponse;
        setUserLabel(me.full_name || me.email || "User");
        localStorage.setItem("user", JSON.stringify(me));

        setCircles(circlesData?.circles || []);
      } catch (e: any) {
        setErr(e?.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [router]);

  return (
    <DashboardShell
      title="My Circles"
      subtitle="View and manage your savings circles"
      userLabel={userLabel}
      actions={
        <Link
          href="/dashboard/circles/new"
          className="rounded-xl px-3 py-2 text-xs font-bold text-white"
          style={{
            background: "rgba(16,185,129,0.85)",
            border: "1px solid rgba(16,185,129,0.4)",
          }}
        >
          + New Circle
        </Link>
      }
    >
      <div className="mb-4">
        <Link
          href="/dashboard"
          className="text-sm text-emerald-400 hover:text-emerald-300"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {err && (
        <div className="mb-4 rounded-xl bg-rose-500/10 p-3 text-sm text-rose-300">
          {err}
        </div>
      )}

      <Section title="Your Circles" count={circles.length}>
        {loading ? (
          <p className="text-white/50 text-sm">Loading circles...</p>
        ) : circles.length === 0 ? (
          <p className="text-white/50 text-sm">No circles found.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {circles.map((circle) => (
              <GlassCard key={circle.id}>
                <div className="flex justify-between">
                  <div>
                    <h2 className="text-white font-bold text-lg">
                      {circle.name}
                    </h2>
                    <p className="text-white/50 text-sm">
                      ${circle.contribution_amount}/month
                    </p>
                    <p className="text-white/40 text-xs">
                      Circle #{circle.id}
                    </p>
                  </div>

                  <div>
                    {circle.membership_status === "APPROVED" ? (
                      <Badge color="emerald">Approved</Badge>
                    ) : circle.membership_status === "PENDING" ? (
                      <Badge color="blue">Pending</Badge>
                    ) : (
                      <Badge color="slate">Member</Badge>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex justify-between items-center">
                  <p className="text-white/40 text-xs">
                    Joined{" "}
                    {circle.joined_at
                      ? new Date(circle.joined_at).toLocaleDateString()
                      : "—"}
                  </p>

                  <Link
                    href={`/dashboard/circles/${circle.id}`}
                    className="text-emerald-400 text-sm font-bold"
                  >
                    Open →
                  </Link>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </Section>
    </DashboardShell>
  );
}