"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

export default function OtpPage() {
  const router = useRouter();
  const params = useSearchParams();

  const defaultEmail = useMemo(() => params.get("email") ?? "", [params]);

  const [email, setEmail] = useState(defaultEmail);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const onVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }), // ✅ IMPORTANT: 'code'
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsg(data?.error || "OTP verification failed.");
        return;
      }

      setMsg("✅ Email verified! Redirecting to login...");
      setTimeout(() => router.push("/login"), 700);
    } catch {
      setMsg("Network error while verifying OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-lg ring-1 ring-slate-200">
        <h2 className="text-xl font-bold">Verify OTP</h2>
        <p className="mt-1 text-sm text-slate-600">
          Enter the 6-digit OTP generated after login.
        </p>

        <form onSubmit={onVerify} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Email</label>
            <input
              className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              type="email"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">OTP</label>
            <input
              className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm tracking-widest outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="123456"
              inputMode="numeric"
              maxLength={6}
              required
            />
          </div>

          {msg && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              {msg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Verifying..." : "Verify OTP"}
          </button>

          <button
            type="button"
            className="w-full rounded-2xl border border-slate-300 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            onClick={() => router.push("/login")}
          >
            Back to Login
          </button>
        </form>
      </div>
    </main>
  );
}