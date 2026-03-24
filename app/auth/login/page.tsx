"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  // ── Redirect if already logged in ────────────────────────────────────────
  useEffect(() => {
    const check = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        router.replace("/dashboard");
        return;
      }
      setChecking(false);
    };
    check();
  }, []);

  // Don't flash the login form to already-authenticated users
  if (checking) return null;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      // User is already verified — signInWithPassword creates a full session
      router.replace("/dashboard");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white text-slate-900 md:grid md:grid-cols-2">
      {/* ── LEFT — dark hero panel ─────────────────────────────────────────── */}
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 md:flex md:flex-col md:justify-between md:p-12">
        <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-teal-400/10 blur-3xl" />

        <Link href="/" className="relative flex items-center gap-3">
          <img
            src="/assets/circlesave-logo.png"
            alt="CircleSave"
            className="h-10 w-10 rounded-xl object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              const fb = e.currentTarget
                .nextElementSibling as HTMLElement | null;
              if (fb) fb.style.display = "grid";
            }}
          />
          <div className="hidden h-10 w-10 place-items-center rounded-xl bg-emerald-500 text-base font-black text-white">
            C
          </div>
          <span className="text-lg font-bold text-white">CircleSave</span>
        </Link>

        <div className="relative">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            OTP-secured login
          </div>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white">
            Secure Savings{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              Platform.
            </span>
          </h1>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-slate-400">
            Every login requires an OTP verification sent to your email —
            keeping your circle and funds protected.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3">
            {[
              ["Invite-only circles", "Admin controls membership"],
              ["No custody", "We never hold funds"],
            ].map(([title, desc]) => (
              <div
                key={title}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
              >
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="mt-1 text-xs text-slate-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-slate-600">
          © {new Date().getFullYear()} CircleSave
        </p>
      </section>

      {/* ── RIGHT — form panel ────────────────────────────────────────────────── */}
      <section className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 py-12">
        {/* Mobile brand */}
        <div className="mb-8 flex items-center gap-3 md:hidden">
          <Link href="/" className="flex items-center gap-3">
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
            <span className="text-lg font-bold text-slate-900">CircleSave</span>
          </Link>
        </div>

        <div className="w-full max-w-md">
          <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Welcome back
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Enter your credentials. OTP verification comes next.
            </p>

            <form onSubmit={onSubmit} className="mt-7 space-y-5">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Email
                </label>
                <input
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  type="email"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-medium text-emerald-600 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <input
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  type={showPassword ? "text" : "password"}
                  required
                />
                <label className="mt-2.5 flex items-center gap-2 text-xs text-slate-500">
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                    className="accent-emerald-600"
                  />
                  Show password
                </label>
              </div>

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:opacity-60"
              >
                {loading ? "Logging in..." : "Log in →"}
              </button>

              <div className="relative flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs text-slate-400">or</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <Link
                href="/auth/signup"
                className="block w-full rounded-2xl border border-emerald-200 py-3 text-center text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
              >
                Create new account
              </Link>
            </form>
          </div>
          <p className="mt-6 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} CircleSave · OTP-secured platform
          </p>
        </div>
      </section>
    </main>
  );
}
