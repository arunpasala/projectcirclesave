"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const writeAuditLog = async (
    action: string,
    status: "success" | "error",
    metadata?: Record<string, unknown>
  ) => {
    try {
      await fetch("/api/audit-log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          status,
          metadata,
        }),
      });
    } catch (error) {
      console.error("AUDIT_LOG_CLIENT_ERROR:", error);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        normalizedEmail,
        {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        }
      );

      if (error) {
        await writeAuditLog("PASSWORD_RESET_REQUEST", "error", {
          email: normalizedEmail,
          reason: error.message,
        });

        setMsg({ type: "error", text: error.message });
        return;
      }

      await writeAuditLog("PASSWORD_RESET_REQUEST", "success", {
        email: normalizedEmail,
      });

      setMsg({
        type: "success",
        text: "If that email is registered, a reset link has been sent. Check your inbox and spam folder.",
      });
    } catch {
      await writeAuditLog("PASSWORD_RESET_REQUEST", "error", {
        email: normalizedEmail,
        reason: "network_error",
      });

      setMsg({
        type: "error",
        text: "Network error. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white text-slate-900 md:grid md:grid-cols-2">
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
              const fb = e.currentTarget.nextElementSibling as HTMLElement | null;
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
            Account recovery
          </div>

          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white">
            Forgot your{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              password?
            </span>
          </h1>

          <p className="mt-4 max-w-sm text-base leading-relaxed text-slate-400">
            No worries. Enter your email and we&apos;ll send you a secure link to
            reset your password and get back to your circle.
          </p>

          <div className="mt-8 space-y-3">
            {[
              ["Check your inbox", "Look for an email from CircleSave"],
              ["Check spam too", "Reset emails sometimes land there"],
              ["Use latest link", "Older recovery links may expire"],
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

      <section className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 py-12">
        <div className="mb-8 flex items-center gap-3 md:hidden">
          <Link href="/" className="flex items-center gap-3">
            <img
              src="/assets/circlesave-logo.png"
              alt="CircleSave"
              className="h-9 w-9 rounded-xl object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                const fb = e.currentTarget.nextElementSibling as HTMLElement | null;
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
              <span className="text-2xl">📧</span>
            </div>

            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Reset your password
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Enter your email and we&apos;ll send you a reset link.
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
                  type="email"
                  placeholder="you@example.com"
                  required
                />
              </div>

              {msg && (
                <div
                  className={`rounded-2xl border px-4 py-3 text-sm ${
                    msg.type === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-red-200 bg-red-50 text-red-600"
                  }`}
                >
                  {msg.text}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:opacity-60"
              >
                {loading ? "Sending..." : "Send reset link →"}
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