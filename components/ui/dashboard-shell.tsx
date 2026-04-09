"use client";

import Link from "next/link";
import React from "react";

function cls(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export function Badge({
  children,
  color,
}: {
  children: React.ReactNode;
  color: "emerald" | "blue" | "rose" | "slate" | "amber";
}) {
  const map = {
    emerald:
      "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30 backdrop-blur-sm",
    blue: "bg-blue-500/10 text-blue-300 ring-blue-500/30 backdrop-blur-sm",
    rose: "bg-rose-500/10 text-rose-300 ring-rose-500/30 backdrop-blur-sm",
    slate: "bg-white/5 text-slate-300 ring-white/10 backdrop-blur-sm",
    amber:
      "bg-amber-500/10 text-amber-300 ring-amber-500/30 backdrop-blur-sm",
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

export function Section({
  title,
  subtitle,
  count,
  children,
}: {
  title: string;
  subtitle?: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="overflow-hidden rounded-3xl transition-all duration-300"
      style={{
        background: "rgba(255,255,255,0.06)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow:
          "0 4px 24px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.08)",
      }}
    >
      <div className="flex w-full items-center justify-between gap-4 px-6 py-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">{title}</span>
            {count !== undefined ? (
              <span
                className="rounded-full px-2 py-0.5 text-xs font-semibold"
                style={{
                  background: "rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.7)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                {count}
              </span>
            ) : null}
          </div>

          {subtitle ? (
            <p
              className="mt-0.5 text-xs"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>

      <div
        className="px-6 py-5"
        style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
      >
        {children}
      </div>
    </div>
  );
}

export function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cls("rounded-2xl p-4", className)}
      style={{
        background: "rgba(255,255,255,0.05)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
      }}
    >
      {children}
    </div>
  );
}

export function DashboardShell({
  title,
  subtitle,
  userLabel = "CircleSave User",
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  userLabel?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const glassBtnBase: React.CSSProperties = {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.15)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    color: "rgba(255,255,255,0.8)",
    transition: "all 0.2s ease",
  };

  return (
    <main
      className="min-h-screen text-white"
      style={{
        background:
          "linear-gradient(135deg, #0f172a 0%, #134e4a 50%, #0f172a 100%)",
      }}
    >
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute rounded-full"
          style={{
            width: 600,
            height: 600,
            top: -200,
            left: -150,
            background:
              "radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)",
            animation: "float 8s ease-in-out infinite",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 500,
            height: 500,
            bottom: -100,
            right: -100,
            background:
              "radial-gradient(circle, rgba(59,130,246,0.10) 0%, transparent 70%)",
            animation: "float 10s ease-in-out infinite reverse",
          }}
        />
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-30px) scale(1.05); }
        }
        .glass-card-hover {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .glass-card-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.12);
        }
      `}</style>

      <nav
        className="sticky top-0 z-30"
        style={{
          background: "rgba(15,23,42,0.7)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div
              className="grid h-8 w-8 place-items-center rounded-xl text-sm font-black text-white"
              style={{
                background: "linear-gradient(135deg, #10b981, #059669)",
                boxShadow: "0 0 16px rgba(16,185,129,0.4)",
              }}
            >
              C
            </div>
            <span className="font-bold text-white">CircleSave</span>
          </Link>

          <div className="flex items-center gap-3">
            <div
              className="hidden items-center gap-2 rounded-xl px-3 py-1.5 sm:flex"
              style={glassBtnBase}
            >
              <div
                className="flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold text-white"
                style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
              >
                {(userLabel || "U").charAt(0).toUpperCase()}
              </div>
              <span
                className="max-w-[140px] truncate text-xs font-semibold"
                style={{ color: "rgba(255,255,255,0.8)" }}
              >
                {userLabel}
              </span>
            </div>
            {actions}
          </div>
        </div>
      </nav>

      <div className="relative mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              {title}
            </h1>
            {subtitle ? (
              <p
                className="mt-1 text-sm"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>

        {children}

        <footer
          className="py-10 text-center text-xs"
          style={{ color: "rgba(255,255,255,0.25)" }}
        >
          © {new Date().getFullYear()} CircleSave · Secure savings circle platform
        </footer>
      </div>
    </main>
  );
}