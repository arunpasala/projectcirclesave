import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f0f2f5] text-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-[#f0f2f5]/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#1877F2] text-white font-extrabold shadow-[0_12px_28px_rgba(24,119,242,0.25)]">
              C
            </div>
            <span className="text-lg font-extrabold tracking-tight">CircleSave</span>
          </div>

          <nav className="hidden items-center gap-6 text-sm font-semibold text-gray-700 md:flex">
            <a href="#how" className="hover:text-gray-500">How it works</a>
            <a href="#features" className="hover:text-gray-500">Features</a>
            <a href="#safety" className="hover:text-gray-500">Safety</a>
            <a href="#faq" className="hover:text-gray-500">FAQ</a>
            <Link href="/login" className="hover:text-gray-500">Login</Link>
            <Link href="/signup" className="hover:text-gray-500">Sign Up</Link>
          </nav>

          <a
            href="#cta"
            className="rounded-xl bg-[#1877F2] px-4 py-2 text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(24,119,242,0.25)] hover:opacity-95"
          >
            Join the beta
          </a>
        </div>
      </header>

      {/* HERO (same theme as login/signup) */}
      <section className="mx-auto max-w-6xl px-4 py-10 md:py-14">
        <div className="grid items-center gap-10 md:grid-cols-2">
          {/* Left side: hide on small screens */}
          <div className="hidden md:block">
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#1877F2] text-white text-2xl font-extrabold shadow-[0_14px_34px_rgba(24,119,242,0.25)]">
                C
              </div>
              <div>
                <div className="text-xl font-extrabold">CircleSave</div>
                <div className="mt-1 text-sm text-gray-600">
                  Private • Invite-only • Community savings
                </div>
              </div>
            </div>

            <h1 className="mt-6 text-5xl font-extrabold leading-[1.05] tracking-tight">
              Save together.{" "}
              <span className="text-[#1877F2]">Get a lump sum.</span>{" "}
              No interest. No loans.
            </h1>

            <p className="mt-4 max-w-xl text-base leading-relaxed text-gray-600">
              CircleSave helps trusted groups run savings circles (ROSCA / chit / tanda / susu)
              with transparency, reminders, and simple tracking — without the platform ever holding your money.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {["No custody of funds", "Invite-only circles", "Transparent payouts"].map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-extrabold text-gray-700 shadow-sm"
                >
                  {t}
                </span>
              ))}
            </div>

            {/* Decorative cards (optional, matches theme) */}
            <div className="relative mt-8 h-56">
              <div className="absolute left-14 top-0 h-44 w-[22rem] rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-100 to-blue-200 shadow-[0_18px_50px_rgba(0,0,0,0.12)]" />
              <div className="absolute left-0 top-10 h-36 w-64 rounded-2xl border border-gray-200 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.08)]" />
              <div className="absolute left-8 top-36 h-28 w-80 rounded-2xl border border-gray-200 bg-white shadow-[0_12px_35px_rgba(0,0,0,0.10)]" />

              <div className="absolute left-64 top-10 rounded-full bg-[#1877F2] px-4 py-2 text-sm font-extrabold text-white shadow-[0_10px_25px_rgba(24,119,242,0.25)]">
                Trusted
              </div>

              <div className="absolute left-56 top-40 grid h-16 w-16 place-items-center rounded-full border border-gray-200 bg-white shadow-[0_10px_25px_rgba(0,0,0,0.10)]">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-[#1877F2] text-white text-xl font-extrabold">
                  🙂
                </div>
              </div>
            </div>
          </div>

          {/* Right side card: like login/signup */}
          <div className="mx-auto w-full max-w-md">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.10)]">
              <h2 className="text-2xl font-extrabold">Get started</h2>
              <p className="mt-2 text-sm text-gray-600">
                Create a private circle, invite members, track contributions, and keep everything transparent.
              </p>

              <div className="mt-5 flex flex-col gap-3">
                <Link
                  href="/signup"
                  className="w-full rounded-xl bg-[#1877F2] py-3 text-center text-base font-extrabold text-white shadow-[0_12px_28px_rgba(24,119,242,0.25)] hover:opacity-95"
                >
                  Create an account
                </Link>

                <Link
                  href="/login"
                  className="w-full rounded-xl border border-gray-300 bg-white py-3 text-center text-base font-extrabold text-gray-900 hover:bg-gray-50"
                >
                  I already have an account
                </Link>
              </div>

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs font-extrabold text-gray-400">or</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <a href="#how" className="block text-center text-sm font-extrabold text-[#1877F2] hover:underline">
                See how it works
              </a>

              <p className="mt-4 text-xs leading-relaxed text-gray-500">
                CircleSave does not hold money. Members pay the recipient directly. The platform tracks status only.
              </p>
            </div>

            <p className="mt-4 text-center text-sm text-gray-600">
              Security-first MVP • OTP verification • JWT auth • DB integrity
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-gray-200 bg-[#f0f2f5]">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-2xl font-extrabold tracking-tight">How a savings circle works</h2>
          <p className="mt-2 max-w-2xl text-sm text-gray-600">
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
              <div
                key={s.title}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_10px_28px_rgba(0,0,0,0.08)]"
              >
                <p className="text-sm font-extrabold">{s.title}</p>
                <p className="mt-2 text-sm text-gray-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-gray-200 bg-[#f0f2f5]">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-2xl font-extrabold tracking-tight">MVP features</h2>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {[
              ["OTP verification", "Email OTP for low-friction onboarding."],
              ["Invite-only circles", "Private joining with clear rules before participation."],
              ["Status dashboard", "Paid / pending tracking, month progress, next payout."],
              ["Notifications", "Due reminders, confirmations, and payout alerts."],
              ["Dispute handling", "Manual admin intervention early stage if needed."],
              ["Compliance-first design", "Not a bank, lender, wallet, or custodian."],
            ].map(([t, d]) => (
              <div
                key={t}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_10px_28px_rgba(0,0,0,0.08)]"
              >
                <p className="text-sm font-extrabold">{t}</p>
                <p className="mt-2 text-sm text-gray-600">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Safety */}
      <section id="safety" className="border-t border-gray-200 bg-[#f0f2f5]">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-2xl font-extrabold tracking-tight">Safety & positioning</h2>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_10px_28px_rgba(0,0,0,0.08)]">
              <p className="text-sm font-extrabold">What CircleSave is</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-gray-600">
                <li>A coordination + transparency tool</li>
                <li>A reminder and tracking system</li>
                <li>Community-driven savings organizer</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_10px_28px_rgba(0,0,0,0.08)]">
              <p className="text-sm font-extrabold">What CircleSave is not</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-gray-600">
                <li>Not a bank</li>
                <li>Not a lender</li>
                <li>Not an investment product</li>
                <li>Not a wallet / money custodian</li>
              </ul>
            </div>
          </div>

          <p className="mt-6 text-xs leading-relaxed text-gray-500">
            Disclaimer: CircleSave does not hold funds, guarantee payments, or provide loans. Participation is voluntary
            and based on trust among members.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-gray-200 bg-[#f0f2f5]">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-2xl font-extrabold tracking-tight">FAQ</h2>

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
              <div
                key={f.q}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_10px_28px_rgba(0,0,0,0.08)]"
              >
                <p className="text-sm font-extrabold">{f.q}</p>
                <p className="mt-2 text-sm text-gray-600">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="cta" className="border-t border-gray-200 bg-[#f0f2f5]">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="rounded-2xl bg-gray-900 p-8 text-white shadow-[0_18px_45px_rgba(0,0,0,0.18)]">
            <h2 className="text-2xl font-extrabold tracking-tight">Join the private beta</h2>
            <p className="mt-2 max-w-2xl text-sm text-white/75">
              Get early access to CircleSave for your trusted group. Invite-only. No fees during the pilot.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                placeholder="Your email"
                className="w-full rounded-xl bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/60 outline-none ring-1 ring-white/15 focus:ring-2"
              />
              <button className="rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-gray-900 hover:bg-white/90">
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
      <footer className="border-t border-gray-200 bg-[#f0f2f5]">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-xs text-gray-500 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} CircleSave. All rights reserved.</p>
          <p>Coordination platform only — no custody, no loans, no guarantees.</p>
        </div>
      </footer>
    </main>
  );
}
