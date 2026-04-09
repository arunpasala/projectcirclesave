"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Me = {
  email: string;
  full_name: string | null;
};

type JwtPayload = {
  userId: string;
  authUserId?: string;
  email?: string;
  role?: string;
  exp?: number;
};

interface HeaderProps {
  variant?: "landing" | "app";
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

export default function Header({ variant = "app" }: HeaderProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [me, setMe] = useState<Me | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const syncAuth = () => {
      const token = localStorage.getItem("token");
      const savedUser = localStorage.getItem("user");

      if (!token) {
        setIsLoggedIn(false);
        setMe(null);
        return;
      }

      const payload = parseJwt(token);

      if (!payload?.userId) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setIsLoggedIn(false);
        setMe(null);
        return;
      }

      if (payload.exp && Date.now() >= payload.exp * 1000) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setIsLoggedIn(false);
        setMe(null);
        return;
      }

      let fullName: string | null = null;

      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          fullName = parsed?.full_name || null;
        } catch {}
      }

      setIsLoggedIn(true);
      setMe({
        email: payload.email || "",
        full_name: fullName,
      });
    };

    syncAuth();

    const onStorage = () => syncAuth();
    const onAuthChanged = () => syncAuth();

    window.addEventListener("storage", onStorage);
    window.addEventListener("authChanged", onAuthChanged);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("authChanged", onAuthChanged);
    };
  }, []);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const displayName =
    (me?.full_name && me.full_name.trim()) ||
    (me?.email ? me.email.split("@")[0] : "Account");

  const initial = (displayName?.[0] || "C").toUpperCase();

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsLoggedIn(false);
    setMe(null);
    setOpen(false);
    window.dispatchEvent(new Event("authChanged"));
    router.push("/auth/login");
  }

  if (variant === "app") {
    return (
      <header className="sticky top-0 z-50 border-b border-emerald-700/40 bg-emerald-600">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link
            href="/"
            className="text-base font-bold tracking-tight text-white"
          >
            CircleSave
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Dashboard
            </Link>

            {isLoggedIn ? (
              <div ref={menuRef} className="relative">
                <button
                  onClick={() => setOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition hover:bg-white/10"
                >
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-white/20 text-xs font-bold text-white">
                    {initial}
                  </div>
                  <span className="hidden max-w-[140px] truncate text-sm font-medium text-white sm:block">
                    {displayName}
                  </span>
                  <span className="text-xs text-white/70">▾</span>
                </button>

                {open && (
                  <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-slate-100 bg-white p-2 shadow-xl">
                    <div className="mb-1 rounded-xl px-3 py-2">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {displayName}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {me?.email || "Signed in"}
                      </p>
                    </div>

                    <Link
                      href="/profile"
                      onClick={() => setOpen(false)}
                      className="block rounded-xl px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Your account
                    </Link>

                    <Link
                      href="/dashboard"
                      onClick={() => setOpen(false)}
                      className="block rounded-xl px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Dashboard
                    </Link>

                    <Link
                      href="/support"
                      onClick={() => setOpen(false)}
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
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Log in
                </Link>
                <Link
                  href="/auth/signup"
                  className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
    );
  }

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
                    <div className="border-b border-slate-100 px-4 py-3">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {displayName}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {me?.email || "Signed in"}
                      </p>
                    </div>

                    <Link
                      href="/profile"
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
                      Dashboard
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