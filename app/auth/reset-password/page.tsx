"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PasswordStrength from "@/components/auth/PasswordStrength";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordPageContent />
    </Suspense>
  );
}

function ResetPasswordPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [msg, setMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [expiredLink, setExpiredLink] = useState(false);

  const writeAuditLog = async (
    action: string,
    status: "success" | "error",
    metadata?: Record<string, unknown>
  ) => {
    try {
      const accessToken =
        (await supabase.auth.getSession()).data.session?.access_token ?? null;

      await fetch("/api/audit-log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
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

  useEffect(() => {
    const setupRecoverySession = async () => {
      try {
        const error = searchParams.get("error");
        const errorCode = searchParams.get("error_code");
        const errorDescription = searchParams.get("error_description");
        const code = searchParams.get("code");

        if (error || errorCode) {
          setExpiredLink(true);
          setMsg({
            type: "error",
            text:
              errorCode === "otp_expired"
                ? "This reset link has expired. Please request a new password reset email."
                : decodeURIComponent(
                    errorDescription || "Invalid or expired reset link."
                  ),
          });

          await writeAuditLog("PASSWORD_RESET_LINK_OPEN", "error", {
            error,
            errorCode,
            errorDescription,
          });

          setCheckingSession(false);
          return;
        }

        if (code) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            setExpiredLink(true);
            setMsg({
              type: "error",
              text:
                "This reset link is invalid or has expired. Please request a new one.",
            });

            await writeAuditLog("PASSWORD_RESET_LINK_OPEN", "error", {
              reason: exchangeError.message,
            });

            setCheckingSession(false);
            return;
          }
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          setSessionReady(true);
          await writeAuditLog("PASSWORD_RESET_LINK_OPEN", "success", {
            hasSession: true,
          });
        } else {
          setExpiredLink(true);
          setMsg({
            type: "error",
            text:
              "No active recovery session found. Please request a new reset link.",
          });

          await writeAuditLog("PASSWORD_RESET_LINK_OPEN", "error", {
            reason: "no_session",
          });
        }
      } catch {
        setExpiredLink(true);
        setMsg({
          type: "error",
          text: "Unable to verify reset session. Please request a new reset link.",
        });

        await writeAuditLog("PASSWORD_RESET_LINK_OPEN", "error", {
          reason: "unexpected_exception",
        });
      } finally {
        setCheckingSession(false);
      }
    };

    setupRecoverySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") &&
        session
      ) {
        setSessionReady(true);
        setExpiredLink(false);
        setCheckingSession(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [searchParams]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (newPassword.length < 8) {
      setMsg({
        type: "error",
        text: "Password must be at least 8 characters long.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMsg({
        type: "error",
        text: "Passwords do not match.",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        await writeAuditLog("PASSWORD_RESET_COMPLETE", "error", {
          reason: error.message,
        });

        setMsg({ type: "error", text: error.message });
        return;
      }

      await writeAuditLog("PASSWORD_RESET_COMPLETE", "success");

      setMsg({
        type: "success",
        text: "Password updated successfully! Redirecting to login...",
      });

      setTimeout(() => {
        router.push("/auth/login");
      }, 1500);
    } catch {
      await writeAuditLog("PASSWORD_RESET_COMPLETE", "error", {
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
            Set a new{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              password.
            </span>
          </h1>

          <p className="mt-4 max-w-sm text-base leading-relaxed text-slate-400">
            Choose a strong password to keep your savings circle secure.
          </p>

          <div className="mt-8 space-y-3">
            {[
              ["Min 8 characters", "Longer is always stronger"],
              ["Avoid reuse", "Do not reuse passwords from other sites"],
              ["OTP still required", "Every login still needs email verification"],
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
              <span className="text-2xl">🔑</span>
            </div>

            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Reset your password
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Choose a new password for your account.
            </p>

            {checkingSession ? (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-sm font-medium text-slate-600">
                  Checking secure reset session...
                </p>
              </div>
            ) : expiredLink || !sessionReady ? (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                <p className="text-sm font-semibold text-amber-700">
                  Reset link expired or invalid
                </p>
                <p className="mt-1 text-sm text-amber-600">
                  Request a new password reset email and use the latest link from
                  your inbox.
                </p>
                <div className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-xs text-amber-700">
                  For security, recovery links expire after a limited time and
                  reused or old links may fail.
                </div>
                <Link
                  href="/auth/forgot-password"
                  className="mt-3 inline-block text-sm font-semibold text-amber-700 hover:underline"
                >
                  Request new link →
                </Link>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="mt-7 space-y-5">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    New password
                  </label>
                  <input
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 8 characters"
                    required
                  />
                  <PasswordStrength password={newPassword} />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Confirm password
                  </label>
                  <input
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    type={showPassword ? "text" : "password"}
                    placeholder="Re-enter password"
                    required
                  />
                </div>

                <label className="mt-2.5 flex items-center gap-2 text-xs text-slate-500">
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                    className="accent-emerald-600"
                  />
                  Show password
                </label>

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
                  {loading ? "Updating..." : "Update password →"}
                </button>
              </form>
            )}
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