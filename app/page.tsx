// src/app/page.tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-slate-900" />
            <span className="text-lg font-semibold tracking-tight">CircleSave</span>
          </div>

          <nav className="hidden items-center gap-6 text-sm md:flex">
            <a href="#how" className="hover:text-slate-600">How it works</a>
            <a href="#features" className="hover:text-slate-600">Features</a>
            <a href="#safety" className="hover:text-slate-600">Safety</a>
            <a href="#faq" className="hover:text-slate-600">FAQ</a>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="#cta"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Join the beta
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <p className="inline-flex items-center rounded-full border px-3 py-1 text-xs text-slate-700">
              Private • Invite-only • Community savings
            </p>

            <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
              Save together. <span className="text-slate-600">Get a lump sum.</span> No interest. No loans.
            </h1>

            <p className="mt-4 text-base leading-relaxed text-slate-600">
              CircleSave helps trusted groups run savings circles (ROSCA/chit/tanda/susu) with transparency,
              reminders, and simple tracking — without the platform ever holding your money.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href="#cta"
                className="rounded-xl bg-slate-900 px-5 py-3 text-center text-sm font-medium text-white hover:bg-slate-800"
              >
                Request access
              </a>
              <a
                href="#how"
                className="rounded-xl border px-5 py-3 text-center text-sm font-medium hover:bg-slate-50"
              >
                See how it works
              </a>
            </div>

            <div className="mt-6 flex flex-wrap gap-3 text-xs text-slate-500">
              <span className="rounded-full border px-3 py-1">No custody of funds</span>
              <span className="rounded-full border px-3 py-1">No interest</span>
              <span className="rounded-full border px-3 py-1">Invite-only circles</span>
            </div>
          </div>

          {/* Simple “mock” card */}
          <div className="rounded-3xl border bg-slate-50 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Example Circle</p>
                <p className="text-xs text-slate-600">Monthly: $200 • Members: 6</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">
                Month 2 / 6
              </span>
            </div>

            <div className="mt-6 space-y-3">
              {[
                { name: "Arun", status: "Paid" },
                { name: "Sam", status: "Paid" },
                { name: "Priya", status: "Pending" },
                { name: "Leo", status: "Paid" },
              ].map((m) => (
                <div key={m.name} className="flex items-center justify-between rounded-2xl bg-white p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-slate-200" />
                    <div>
                      <p className="text-sm font-medium">{m.name}</p>
                      <p className="text-xs text-slate-500">Contribution</p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      m.status === "Paid"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {m.status}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border bg-white p-4">
              <p className="text-xs text-slate-500">Next payout</p>
              <p className="text-sm font-semibold">Priya • Feb 1</p>
              <p className="mt-2 text-xs text-slate-600">
                Everyone pays the recipient directly. CircleSave only tracks status.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-bold tracking-tight">How a savings circle works</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            A simple, trust-based way to help each member receive a lump sum once — without interest or loans.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              {
                title: "1) Create a private circle",
                desc: "Set monthly amount, member count, start date, and payout order upfront.",
              },
              {
                title: "2) Members contribute monthly",
                desc: "Each month, members pay the current recipient directly (platform does not hold funds).",
              },
              {
                title: "3) One member receives the lump sum",
                desc: "Repeat monthly until everyone has received once. Progress is transparent to all members.",
              },
            ].map((s) => (
              <div key={s.title} className="rounded-3xl border p-6 shadow-sm">
                <p className="text-sm font-semibold">{s.title}</p>
                <p className="mt-2 text-sm text-slate-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-bold tracking-tight">MVP features</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {[
              ["Passwordless login", "Email OTP for low-friction onboarding."],
              ["Invite-only circles", "Private links and transparent rules before joining."],
              ["Status dashboard", "Paid / pending tracking, month progress, next payout."],
              ["Notifications", "Due reminders, payment confirmations, payout alerts."],
              ["Dispute handling", "Manual admin intervention early stage if needed."],
              ["Compliance-first design", "Not a bank, lender, wallet, or custodian."],
            ].map(([t, d]) => (
              <div key={t} className="rounded-3xl border bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold">{t}</p>
                <p className="mt-2 text-sm text-slate-600">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Safety / positioning */}
      <section id="safety" className="border-t bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-bold tracking-tight">Safety & positioning</h2>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border p-6 shadow-sm">
              <p className="text-sm font-semibold">What CircleSave is</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
                <li>A coordination + transparency tool</li>
                <li>A reminder and tracking system</li>
                <li>Community-driven savings organizer</li>
              </ul>
            </div>

            <div className="rounded-3xl border p-6 shadow-sm">
              <p className="text-sm font-semibold">What CircleSave is not</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
                <li>Not a bank</li>
                <li>Not a lender</li>
                <li>Not an investment product</li>
                <li>Not a wallet / money custodian</li>
              </ul>
            </div>
          </div>

          <p className="mt-6 text-xs leading-relaxed text-slate-500">
            Disclaimer: CircleSave does not hold funds, guarantee payments, or provide loans. Participation is voluntary
            and based on trust among members.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-bold tracking-tight">FAQ</h2>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {[
              {
                q: "Do you hold or store users’ money?",
                a: "No. Members pay the recipient directly. CircleSave only records payment status.",
              },
              {
                q: "Is there interest or profit from pooled money?",
                a: "No. Savings circles are no-interest and trust-based.",
              },
              {
                q: "What happens if someone doesn’t pay?",
                a: "Payout can be blocked, the circle shows pending, members are notified, and admin may intervene.",
              },
              {
                q: "When is the mobile app coming?",
                a: "After the web MVP validates real circles. The backend APIs will support mobile apps later.",
              },
            ].map((f) => (
              <div key={f.q} className="rounded-3xl border bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold">{f.q}</p>
                <p className="mt-2 text-sm text-slate-600">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="cta" className="border-t bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="rounded-3xl border bg-slate-900 p-8 text-white md:p-10">
            <h2 className="text-2xl font-bold tracking-tight">Join the private beta</h2>
            <p className="mt-2 max-w-2xl text-sm text-white/80">
              Get early access to CircleSave for your trusted group. Invite-only. No fees during the pilot.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                placeholder="Your email"
                className="w-full rounded-xl bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/60 outline-none ring-1 ring-white/15 focus:ring-2"
              />
              <button className="rounded-xl bg-white px-5 py-3 text-sm font-medium text-slate-900 hover:bg-white/90">
                Request access
              </button>
            </div>

            <p className="mt-3 text-xs text-white/70">
              (MVP note) This form is UI-only for now. We’ll connect it to the database after auth setup.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 text-xs text-slate-500">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <p>© {new Date().getFullYear()} CircleSave. All rights reserved.</p>
            <p>Coordination platform only — no custody, no loans, no guarantees.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
