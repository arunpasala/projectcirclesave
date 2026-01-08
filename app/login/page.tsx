"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) return setError(data?.error ?? "Login failed");
    router.push("/app"); // your protected area
  }

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-6">
            <Link href="/" className="text-sm text-slate-600 hover:text-slate-900">← Back</Link>
            <h1 className="mt-3 text-2xl font-semibold">Welcome back</h1>
            <p className="mt-1 text-sm text-slate-600">Log in to manage your circles.</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email</label>
              <input
                className="mt-2 w-full rounded-xl border px-3 py-3 outline-none focus:ring-2"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">Password</label>
              <input
                className="mt-2 w-full rounded-xl border px-3 py-3 outline-none focus:ring-2"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              disabled={loading}
              className="w-full rounded-xl bg-slate-900 py-3 text-sm font-medium text-white disabled:opacity-60"
            >
              {loading ? "Logging in..." : "Log in"}
            </button>
          </form>

          <p className="mt-4 text-sm text-slate-600">
            New here? <Link className="underline" href="/signup">Create an account</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
