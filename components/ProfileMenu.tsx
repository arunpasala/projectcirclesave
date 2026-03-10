"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getToken, logout } from "@/lib/client-auth";

type Me = {
  id: number;
  email: string;
  full_name: string | null;
};

export default function ProfileMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // close on outside click
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => {
    // fetch user info for header display
    const token = getToken();
    if (!token) return;

    (async () => {
      try {
        const res = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setMe(data.user);
      } catch {
        // ignore
      }
    })();
  }, []);

  const displayName =
    (me?.full_name && me.full_name.trim()) ||
    (me?.email ? me.email.split("@")[0] : "Account");

  const initial = (displayName?.[0] || "C").toUpperCase();

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-white/10"
      >
        <div className="grid h-9 w-9 place-items-center rounded-full bg-white/20 text-sm font-semibold text-white">
          {initial}
        </div>
        <span className="hidden text-sm font-medium text-white sm:block">
          {displayName}
        </span>
        <span className="text-white/90">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-60 rounded-2xl border bg-white p-2 shadow-xl">
          <Link
            onClick={() => setOpen(false)}
            href="/account"
            className="block rounded-xl px-3 py-2 text-sm hover:bg-slate-50"
          >
            Your account
          </Link>

          <Link
            onClick={() => setOpen(false)}
            href="/dashboard"
            className="block rounded-xl px-3 py-2 text-sm hover:bg-slate-50"
          >
            Create a group
          </Link>

          <Link
            onClick={() => setOpen(false)}
            href="/fairness"
            className="block rounded-xl px-3 py-2 text-sm hover:bg-slate-50"
          >
            Fairness calculators
          </Link>

          <Link
            onClick={() => setOpen(false)}
            href="/support"
            className="block rounded-xl px-3 py-2 text-sm hover:bg-slate-50"
          >
            Contact support
          </Link>

          <div className="my-2 h-px bg-slate-100" />

          <button
            onClick={handleLogout}
            className="w-full rounded-xl px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
