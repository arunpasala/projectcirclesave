"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignupPage() {
    const router = useRouter();
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function onSubmit(e: React.FormEvent) {
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
                setError(data?.error || "Signup failed");
                return;
            }

            // ✅ IMPORTANT: remember email and redirect to OTP
            localStorage.setItem("pendingOtpEmail", email);
            router.push(`/otp?email=${encodeURIComponent(email)}`);
        } catch {
            setError("Network error");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-3xl border bg-white p-8 shadow-sm">
                <h1 className="text-2xl font-bold">Create account</h1>
                <p className="mt-1 text-sm text-slate-600">Create your account and verify your email.</p>

                {error && (
                    <div className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200">
                        {error}
                    </div>
                )}

                <form className="mt-6 space-y-4" onSubmit={onSubmit}>
                    <div>
                        <label className="text-sm font-medium">Full name</label>
                        <input
                            className="mt-2 w-full rounded-xl border px-4 py-3 outline-none focus:ring-2"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Arun"
                            required
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium">Email</label>
                        <input
                            type="email"
                            className="mt-2 w-full rounded-xl border px-4 py-3 outline-none focus:ring-2"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="test3@gmail.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium">Password</label>
                        <div className="mt-2 flex gap-2">
                            <input
                                type={showPw ? "text" : "password"}
                                className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Pass@1234"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPw((s) => !s)}
                                className="rounded-xl border px-4 py-3 text-sm font-semibold hover:bg-slate-50"
                            >
                                {showPw ? "Hide" : "Show"}
                            </button>
                        </div>
                    </div>

                    <button
                        disabled={loading}
                        className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                        {loading ? "Creating..." : "Create account"}
                    </button>
                </form>
            </div>
        </main>
    );
}
