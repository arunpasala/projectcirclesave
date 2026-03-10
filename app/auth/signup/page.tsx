"use client";



import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignupPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error || "Signup failed. Please try again.");
        return;
      }

      // after signup, you can send OTP or redirect to login
      router.push("/login");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-4 py-12 md:grid-cols-2">
        {/* LEFT */}
        <section className="hidden md:block">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-600 text-white text-xl font-bold">
              C
            </div>
            <span className="text-lg font-semibold">CircleSave</span>
          </div>
        

          <h1 className="mt-8 text-5xl font-extrabold leading-tight tracking-tight">
            Build your circle. <span className="text-blue-600">Save together.</span>
          </h1>

          <p className="mt-4 max-w-lg text-lg leading-relaxed text-slate-600">
            Create your account and verify your email to join or manage a savings circle.
          </p>

          <div className="mt-10 grid max-w-lg grid-cols-2 gap-4">
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <p className="text-sm font-semibold">Transparency</p>
              <p className="mt-1 text-sm text-slate-600">Track contributions</p>
            </div>
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <p className="text-sm font-semibold">Security</p>
              <p className="mt-1 text-sm text-slate-600">OTP verification</p>
            </div>
          </div>
        </section>

        {/* RIGHT */}
        <section className="w-full">
          <div className="mb-8 flex items-center justify-center gap-3 md:hidden">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-600 text-white text-lg font-bold">
              C
            </div>
            <span className="text-lg font-semibold">CircleSave</span>
          </div>

          <div className="mx-auto w-full max-w-md rounded-3xl bg-white p-6 shadow-lg ring-1 ring-slate-200">
            <h2 className="text-xl font-bold">Create account</h2>
            <p className="mt-1 text-sm text-slate-600">
              Create your account and verify your email.
            </p>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Full name</label>
                <input
                  className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                />
              </div>

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
                <label className="text-sm font-medium text-slate-700">Password</label>
                <input
                  className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  type={showPassword ? "text" : "password"}
                  required
                />

                <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                  />
                  Show password
                </label>
              </div>

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
              >
                {loading ? "Creating..." : "Create account"}
              </button>

              <div className="my-2 h-px bg-slate-200" />

              <p className="text-center text-sm text-slate-600">
                Already have an account?{" "}
                <Link className="font-semibold text-blue-600 hover:underline" href="/login">
                  Log in
                </Link>
              </p>

              <p className="pt-2 text-center text-xs text-slate-500">
                Your account becomes active after OTP verification.
              </p>

              <p className="pt-2 text-center text-xs text-slate-500">
                © {new Date().getFullYear()} CircleSave
              </p>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
