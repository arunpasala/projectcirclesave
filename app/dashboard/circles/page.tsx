"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Circle = {
  id: number;
  name: string;
  contribution_amount: number;
  created_at: string;
  owner_auth_id: string;
  membership_role?: string | null;
  membership_status?: string | null;
  joined_at?: string | null;
};

type JwtPayload = {
  userId: string;
  authUserId?: string;
  email?: string;
  role?: string;
  exp?: number;
};

function cls(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

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

function Badge({
  children,
  color,
}: {
  children: React.ReactNode;
  color: "emerald" | "blue" | "slate";
}) {
  const map = {
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    blue: "bg-blue-50 text-blue-700 ring-blue-200",
    slate: "bg-slate-100 text-slate-600 ring-slate-200",
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

export default function DashboardCirclesPage() {
  const router = useRouter();

  const [circles, setCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

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

        const res = await fetch("/api/circles/my", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data?.error || "Failed to load circles");
        }

        setCircles(data.circles || []);
      } catch (e: any) {
        setErr(e?.message || "Failed to load circles.");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [router]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-emerald-700 hover:text-emerald-600"
            >
              ← Back to Dashboard
            </Link>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
              My Circles
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              View and open the circles you are part of
            </p>
          </div>

          <Link
            href="/dashboard/circles/new"
            className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500"
          >
            Create New Circle
          </Link>
        </div>

        {err ? (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {err}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">Loading circles...</p>
          </div>
        ) : circles.length === 0 ? (
          <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">No circles found yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {circles.map((circle) => (
              <Link
                key={circle.id}
                href={`/dashboard/circles/${circle.id}`}
                className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      {circle.name}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      ${circle.contribution_amount}/month
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
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

                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs text-slate-400">
                    Joined{" "}
                    {circle.joined_at
                      ? new Date(circle.joined_at).toLocaleDateString()
                      : "—"}
                  </p>
                  <span className="text-sm font-semibold text-emerald-700">
                    Open →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}