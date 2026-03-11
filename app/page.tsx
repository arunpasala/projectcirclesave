"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/client";

export default function HomePage() {
  const router = useRouter();
  const supabase = createClient();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        router.replace("/dashboard");
        return;
      }
      setChecking(false);
    };
    check();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        router.replace("/dashboard");
      } else {
        setChecking(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Prevent homepage flashing to logged-in users before redirect fires
  if (checking) return null;

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <Header variant="landing" />

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900">
        <div className="pointer-events-none absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 right-0 h-[400px] w-[400px] rounded-full bg-teal-400/10 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-6 py-28 md:py-36">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            OTP-secured · Transparent · Community-first
          </div>

          <h1 className="max-w-3xl text-5xl font-extrabold leading-[1.1] tracking-tight text-white md:text-6xl">
            Save together.{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              Trust each other.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-400">
            CircleSave makes group savings transparent and secure. Create a
            circle, invite members, track every contribution, and receive
            payouts — all verified by OTP.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/auth/signup"
              className="rounded-2xl bg-emerald-500 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
            >
              Get started free →
            </Link>
            <span className="text-sm text-slate-500">
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="font-medium text-emerald-400 hover:underline"
              >
                Log in
              </Link>
            </span>
          </div>

          <div className="mt-14 flex flex-wrap items-center gap-6 border-t border-white/10 pt-10 text-sm text-slate-500">
            <span className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span> No funds held by us
            </span>
            <span className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span> Every login
              OTP-verified
            </span>
            <span className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span> Full contribution
              history
            </span>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────────── */}
      <section className="bg-slate-50 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
            How it works
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
            Three steps to your first circle
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Create a circle",
                desc: "Set a monthly contribution amount and cycle length. You become the admin and control who joins.",
                accent: "bg-emerald-50 text-emerald-600",
                bar: "from-emerald-400 to-teal-400",
              },
              {
                step: "2",
                title: "Invite & approve members",
                desc: "Members request to join. You approve or reject. Everyone gets notified at each step — no surprises.",
                accent: "bg-teal-50 text-teal-600",
                bar: "from-teal-400 to-emerald-400",
              },
              {
                step: "3",
                title: "Track & receive payouts",
                desc: "Your dashboard shows every circle, all contributions, and payout history — fully transparent for every member.",
                accent: "bg-slate-100 text-slate-700",
                bar: "from-slate-400 to-slate-600",
              },
            ].map(({ step, title, desc, accent, bar }) => (
              <div
                key={step}
                className="group relative overflow-hidden rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md hover:ring-emerald-200"
              >
                <div
                  className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl text-2xl font-black ${accent}`}
                >
                  {step}
                </div>
                <h3 className="text-base font-bold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  {desc}
                </p>
                <div
                  className={`absolute bottom-0 left-0 h-1 w-0 bg-gradient-to-r ${bar} transition-all duration-300 group-hover:w-full`}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust / value props ──────────────────────────────────────────────── */}
      <section className="bg-white px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
                Why CircleSave
              </p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
                Built on transparency,{" "}
                <span className="text-emerald-600">not trust alone</span>
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-500">
                Traditional rotating savings groups run on goodwill. CircleSave
                adds a verifiable layer — every action is logged, every member
                can see the history, and every login requires OTP confirmation.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  ["Invite-only circles", "Admin controls membership entirely"],
                  ["No fund custody", "We never hold your money"],
                  ["Full audit log", "Every contribution timestamped"],
                  ["OTP on every login", "Protects all members' accounts"],
                ].map(([title, desc]) => (
                  <li key={title} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs text-emerald-700">
                      ✓
                    </span>
                    <div>
                      <span className="text-sm font-semibold text-slate-800">
                        {title}
                      </span>
                      <span className="ml-2 text-sm text-slate-500">
                        {desc}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  value: "100%",
                  label: "OTP verified logins",
                  bg: "bg-emerald-50",
                  text: "text-emerald-700",
                },
                {
                  value: "0%",
                  label: "Funds held by us",
                  bg: "bg-teal-50",
                  text: "text-teal-700",
                },
                {
                  value: "Full",
                  label: "Contribution history",
                  bg: "bg-slate-100",
                  text: "text-slate-700",
                },
                {
                  value: "Live",
                  label: "Payout notifications",
                  bg: "bg-amber-50",
                  text: "text-amber-700",
                },
              ].map(({ value, label, bg, text }) => (
                <div key={label} className={`rounded-3xl p-6 ${bg}`}>
                  <div className={`text-3xl font-extrabold ${text}`}>
                    {value}
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-600">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-16 text-center">
        <h2 className="text-3xl font-extrabold text-white">
          Ready to start your circle?
        </h2>
        <p className="mt-3 text-base text-emerald-100">
          Free to join. No hidden fees. OTP-secured from day one.
        </p>
        <Link
          href="/auth/signup"
          className="mt-8 inline-block rounded-2xl bg-white px-8 py-3.5 text-sm font-bold text-emerald-700 shadow-lg transition hover:bg-emerald-50"
        >
          Create your account →
        </Link>
      </section>

      <footer className="border-t border-slate-100 bg-white px-6 py-8 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} CircleSave · Built for community savings
      </footer>
    </main>
  );
}
