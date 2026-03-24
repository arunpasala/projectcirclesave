"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Me = { email: string; full_name: string | null };

interface HeaderProps {
  variant?: "landing" | "app";
}

export default function Header({ variant = "app" }: HeaderProps) {
  const router = useRouter();
  const supabase = createClient();

  const [me, setMe] = useState<Me | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // ── Auth check ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setIsLoggedIn(true);
      setMe({
        email: user.email ?? "",
        full_name: user.user_metadata?.full_name ?? null,
      });
    };
    getUser();

    // ✅ Keep header in sync when session changes (login/logout in another tab)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setIsLoggedIn(true);
        setMe({
          email: session.user.email ?? "",
          full_name: session.user.user_metadata?.full_name ?? null,
        });
      } else {
        setIsLoggedIn(false);
        setMe(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Close dropdown on outside click ────────────────────────────────────────
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const displayName =
    (me?.full_name && me.full_name.trim()) ||
    (me?.email ? me.email.split("@")[0] : "Account");

  const initial = (displayName?.[0] || "C").toUpperCase();

  async function handleLogout() {
    await supabase.auth.signOut(); // ✅ clears HttpOnly session cookie
    router.push("/auth/login");
  }

  // ── "app" variant — emerald bar (post-login pages) ──────────────────────────
  if (variant === "app") {
    return (
      <header className="sticky top-0 z-50 border-b border-emerald-700/40 bg-emerald-600">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link
            href="/dashboard"
            className="text-base font-bold tracking-tight text-white"
          >
            CircleSave
          </Link>

          <div ref={menuRef} className="relative">
            <button
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition hover:bg-white/10"
            >
              <div className="grid h-8 w-8 place-items-center rounded-full bg-white/20 text-xs font-bold text-white">
                {initial}
              </div>
              <span className="hidden text-sm font-medium text-white sm:block">
                {displayName}
              </span>
              <span className="text-xs text-white/70">▾</span>
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-slate-100 bg-white p-2 shadow-xl">
                <Link
                  onClick={() => setOpen(false)}
                  href="/account"
                  className="block rounded-xl px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Your account
                </Link>
                <Link
                  onClick={() => setOpen(false)}
                  href="/dashboard"
                  className="block rounded-xl px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Create a group
                </Link>
                <Link
                  onClick={() => setOpen(false)}
                  href="/fairness"
                  className="block rounded-xl px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Fairness calculators
                </Link>
                <Link
                  onClick={() => setOpen(false)}
                  href="/support"
                  className="block rounded-xl px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Contact support
                </Link>
                <div className="my-1.5 h-px bg-slate-100" />
                <button
                  onClick={handleLogout}
                  className="w-full rounded-xl px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    );
  }

  // ── "landing" variant — white/blur, auth-aware ──────────────────────────────
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <img
            src="/assets/circlesave-logo.png"
            alt="CircleSave"
            className="h-9 w-9 rounded-xl object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              const fb = e.currentTarget
                .nextElementSibling as HTMLElement | null;
              if (fb) fb.style.display = "grid";
            }}
          />
          <div className="hidden h-9 w-9 place-items-center rounded-xl bg-emerald-600 text-sm font-black text-white">
            C
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold text-slate-900">CircleSave</div>
            <div className="text-[10px] font-medium tracking-wide text-slate-400">
              Savings circles
            </div>
          </div>
        </Link>

        <nav className="flex items-center gap-3">
          {isLoggedIn ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                Dashboard
              </Link>
              <div ref={menuRef} className="relative">
                <button
                  onClick={() => setOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
                >
                  <div className="grid h-6 w-6 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                    {initial}
                  </div>
                  <span className="max-w-[140px] truncate">{displayName}</span>
                  <span className="text-xs text-slate-400">▾</span>
                </button>

                {open && (
                  <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-lg">
                    <Link
                      href="/account"
                      onClick={() => setOpen(false)}
                      className="block px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Your account
                    </Link>
                    <Link
                      href="/dashboard"
                      onClick={() => setOpen(false)}
                      className="block px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      My activity
                    </Link>
                    <Link
                      href="/support"
                      onClick={() => setOpen(false)}
                      className="block px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Contact support
                    </Link>
                    <div className="h-px bg-slate-100" />
                    <button
                      onClick={handleLogout}
                      className="block w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50"
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                Log in
              </Link>
              <Link
                href="/auth/signup"
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
