"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { setToken } from "@/lib/client-auth";

export default function OtpPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const email = useMemo(() => sp.get("email") || "", [sp]);

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  // resend cooldown
  const [cooldown, setCooldown] = useState(30);

  useEffect(() => {
    // start a 30s cooldown when page loads
    setCooldown(30);
    const t = setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [email]);

  const onVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data?.error || "OTP verification failed");
        return;
      }

      setToken(data.token);
      router.push("/dashboard");
    } catch {
      setErr("Network error");
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    if (!email) {
      setErr("Missing email. Go back to login and try again.");
      return;
    }
    if (cooldown > 0) return;

    setErr("");
    setMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data?.error || "Failed to resend OTP");
        return;
      }

      setMsg("OTP resent ✅ Check your inbox/spam.");
      setCooldown(30); // restart cooldown
    } catch {
      setErr("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-md px-4 py-14">
        <div className="rounded-3xl bg-white p-6 shadow ring-1 ring-slate-200">
          <h1 className="text-xl font-bold">Verify OTP</h1>
          <p className="mt-1 text-sm text-slate-600">
            We sent an OTP to <b>{email}</b>
          </p>

          <form onSubmit={onVerify} className="mt-6 space-y-4">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter 6-digit OTP"
              inputMode="numeric"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
              required
            />

            {err ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {err}
              </div>
            ) : null}

            {msg ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {msg}
              </div>
            ) : null}

            <button
              disabled={loading}
              className="w-full rounded-2xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Verifying..." : "Verify & Login"}
            </button>

            <button
              type="button"
              onClick={onResend}
              disabled={loading || cooldown > 0}
              className="w-full rounded-2xl border border-slate-300 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {cooldown > 0 ? `Resend OTP (${cooldown}s)` : "Resend OTP"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/login")}
              className="w-full rounded-2xl border border-slate-300 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back to Login
            </button>
          </form>

          <p className="mt-4 text-xs text-slate-500">
            Tip: Check <b>Spam</b> and <b>Promotions</b>. Gmail sometimes delays OTP emails.
          </p>
        </div>
      </div>
    </main>
  );
}