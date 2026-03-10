"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getToken, logout } from "@/lib/client-auth";

type Me = { id: number; email: string; full_name: string | null };

export default function TopNav() {
  const [token, setToken] = useState("");
  const [me, setMe] = useState<Me | null>(null);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const t = getToken();
    setToken(t);
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch("/api/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setMe(d?.user || null))
      .catch(() => setMe(null));
  }, [token]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as any)) setOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  const onLogout = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-600 text-white font-bold">
            C
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-slate-900">CircleSave</div>
            <div className="text-[11px] text-slate-600">Savings circles • OTP</div>
          </div>
        </Link>

        <nav className="flex items-center gap-4">
          {/* Home should NOT logout */}
          <Link href="/" className="text-sm font-medium text-slate-700 hover:text-slate-900">
            Home
          </Link>

          <Link href="/dashboard" className="text-sm font-medium text-slate-700 hover:text-slate-900">
            Dashboard
          </Link>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
            >
              <div className="h-7 w-7 rounded-full bg-slate-200" />
              <span className="max-w-[160px] truncate">
                {me?.full_name || me?.email || "Account"}
              </span>
              <span className="text-slate-500">▾</span>
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                <Link href="/account" className="block px-4 py-3 text-sm hover:bg-slate-50">
                  Your account
                </Link>
                <Link href="/dashboard" className="block px-4 py-3 text-sm hover:bg-slate-50">
                  My activity
                </Link>
                <Link href="/support" className="block px-4 py-3 text-sm hover:bg-slate-50">
                  Contact support
                </Link>
                <button
                  onClick={onLogout}
                  className="block w-full px-4 py-3 text-left text-sm hover:bg-slate-50"
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}