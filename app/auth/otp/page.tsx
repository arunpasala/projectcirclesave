"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

/* ---------------- MAIN EXPORT ---------------- */
export default function OtpPage() {
  return (
    <Suspense fallback={<OtpFallback />}>
      <OtpContent />
    </Suspense>
  );
}

/* ---------------- FALLBACK ---------------- */
function OtpFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
        <p className="mt-4 text-sm text-slate-500">Loading OTP page…</p>
      </div>
    </div>
  );
}

/* ---------------- ACTUAL PAGE ---------------- */
function OtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const email = useMemo(
    () => (searchParams.get("email") || "").trim().toLowerCase(),
    [searchParams]
  );

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    if (token) {
      router.replace("/dashboard");
      return;
    }

    if (!email) {
      router.replace("/auth/login");
      return;
    }

    setChecking(false);
  }, [email, router]);

  if (checking) return null;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          otp: otp.trim(),
        }),
      });

      const contentType = res.headers.get("content-type") || "";

      if (!contentType.includes("application/json")) {
        const text = await res.text();
        console.error("Server returned non-JSON:", text);
        setError("Server error. Check backend logs.");
        setLoading(false);
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to verify OTP");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      setSuccess("OTP verified successfully. Redirecting...");
      router.replace("/dashboard");
    } catch (err) {
      console.error(err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    router.replace(`/auth/login?email=${encodeURIComponent(email)}`);
  };

  return (
    <main className="min-h-screen bg-white text-slate-900 md:grid md:grid-cols-2">
      {/* LEFT PANEL */}
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 md:flex md:flex-col md:justify-between md:p-12">
        <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-teal-400/10 blur-3xl" />

        <Link href="/" className="relative flex items-center gap-3">
          <img
            src="/assets/circlesave-logo.png"
            alt="CircleSave"
            className="h-10 w-10 rounded-xl object-cover"
          />
          <span className="text-lg font-bold text-white">CircleSave</span>
        </Link>

        <div>
          <h1 className="text-4xl font-extrabold text-white">
            Verify your login
          </h1>
          <p className="mt-4 text-slate-400">
            Enter the OTP sent to your email
          </p>

          <div className="mt-6 text-white font-semibold break-all">
            {email}
          </div>
        </div>
      </section>

      {/* RIGHT PANEL */}
      <section className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-2xl font-bold">Enter OTP</h2>

            <form onSubmit={handleVerify} className="mt-6 space-y-5">
              <input
                className="w-full rounded-xl border p-3 text-center text-lg tracking-widest"
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="******"
                maxLength={6}
              />

              {error && <p className="text-red-500 text-sm">{error}</p>}
              {success && <p className="text-green-600 text-sm">{success}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 text-white py-3 rounded-xl"
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </button>

              <button
                type="button"
                onClick={handleResend}
                className="w-full border py-3 rounded-xl"
              >
                Back to login
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}