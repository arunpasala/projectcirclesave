import Link from "next/link";
import TopNav from "../components/TopNav";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <TopNav />

      {/* Login-like gradient */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-blue-50 via-slate-100 to-slate-100" />
        <div className="relative mx-auto max-w-6xl px-4 py-12">
          <h1 className="text-5xl font-extrabold leading-tight tracking-tight">
            Secure savings circles{" "}
            <span className="text-blue-600">with OTP.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-600">
            CircleSave helps a group save together transparently. You create a
            circle, invite members, everyone contributes monthly, and payouts
            happen in a fair, trackable way.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/login"
              className="rounded-2xl border border-blue-600 px-5 py-3 text-sm font-semibold text-blue-600 hover:bg-blue-50"
            >
              Login
            </Link>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="text-sm font-semibold">1) Create a circle</div>
              <p className="mt-2 text-sm text-slate-600">
                Set a contribution amount. You become the admin/owner.
              </p>
            </div>
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="text-sm font-semibold">
                2) Members request to join
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Anyone can request. Admin approves/rejects. Requests create
                notifications.
              </p>
            </div>
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="text-sm font-semibold">3) Track activity</div>
              <p className="mt-2 text-sm text-slate-600">
                Dashboard shows your circles, requested circles, and
                notifications.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
