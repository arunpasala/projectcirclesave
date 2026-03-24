"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function OtpPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const email = useMemo(() => sp.get("email") || "", [sp]);
  const supabase = createClient();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [cooldown, setCooldown] = useState(30);

  useEffect(() => {
    setCooldown(30);
    const t = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [email]);

  const onVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "email", // ✅ 6-digit code flow
      });

      if (error) {
        setErr(error.message);
        return;
      }

      // ✅ Supabase sets HttpOnly session cookie automatically
      router.push("/dashboard");
    } catch {
      setErr("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    if (cooldown > 0 || !email) return;
    setErr("");
    setMsg("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false }, // resend only, don't create new user
      });

      if (error) {
        setErr(error.message);
        return;
      }

      setMsg("OTP resent — check your inbox and spam folder.");
      setCooldown(30);
    } catch {
      setErr("Network error. Please try again.");
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
            Two-factor security
          </div>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white">
            One last step.{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              You're almost in.
            </span>
          </h1>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-slate-400">
            We sent a 6-digit code to your email. This confirms it's really you
            — keeping your circle safe.
          </p>
          <div className="mt-8 space-y-3">
            {[
              ["Check your inbox", "Look for an email from CircleSave"],
              ["Check spam too", "Gmail sometimes delays OTP emails"],
              ["Code expires soon", "Request a new one if it doesn't arrive"],
            ].map(([title, desc]) => (
              <div key={title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs text-emerald-400">
                  ✓
                </span>
                <div>
                  <span className="text-sm font-semibold text-white">
                    {title}
                  </span>
                  <span className="ml-2 text-sm text-slate-400">{desc}</span>
                </div>
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
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
              <span className="text-2xl">✉️</span>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Check your email
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              We sent a 6-digit code to{" "}
              <span className="font-semibold text-slate-700">{email}</span>
            </p>

            {/* ── Wrong email notice ───────────────────────────────────────── */}
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5">
              <p className="text-xs text-slate-500">
                Email sent to{" "}
                <span className="font-semibold text-slate-700">{email}</span>.
                Not receiving the code?
              </p>
              <p className="mt-1 text-xs text-slate-500">
                This usually means the email address doesn't exist or isn't
                reachable.{" "}
                <button
                  type="button"
                  onClick={() => router.push("/auth/signup")}
                  className="font-semibold text-emerald-600 hover:underline"
                >
                  Go back and try a different email →
                </button>
              </p>
            </div>

            <form onSubmit={onVerify} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  6-digit OTP code
                </label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="000000"
                  inputMode="numeric"
                  maxLength={6}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-center text-2xl font-bold tracking-[0.5em] outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                  required
                />
              </div>

              {err && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {err}
                </div>
              )}
              {msg && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {msg}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:opacity-60"
              >
                {loading ? "Verifying..." : "Verify & log in →"}
              </button>

              <button
                type="button"
                onClick={onResend}
                disabled={loading || cooldown > 0}
                className="w-full rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                {cooldown > 0 ? (
                  <span>
                    Resend code in{" "}
                    <span className="font-bold text-emerald-600">
                      {cooldown}s
                    </span>
                  </span>
                ) : (
                  "Resend OTP"
                )}
              </button>
            </form>
          </div>

          <button
            type="button"
            onClick={() => router.push("/auth/login")}
            className="mt-4 flex w-full items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-700"
          >
            ← Back to login
          </button>

          <p className="mt-4 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} CircleSave · OTP-secured platform
          </p>
        </div>
      </section>
    </main>
  );
}
