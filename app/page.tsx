"use client";

import Link from "next/link";
import Header from "@/components/Header";
import { useEffect, useState } from "react";

function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{
        backgroundImage:
          "linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.14) 50%, rgba(255,255,255,0.06) 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s linear infinite",
      }}
    />
  );
}

function HomeSkeleton() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <div className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-slate-200" />
            <div>
              <div className="h-4 w-28 rounded bg-slate-200" />
              <div className="mt-2 h-3 w-20 rounded bg-slate-100" />
            </div>
          </div>

          <div className="flex gap-3">
            <div className="h-10 w-16 rounded-xl bg-slate-200" />
            <div className="h-10 w-24 rounded-xl bg-slate-200" />
          </div>
        </div>
      </div>

      <section className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <SkeletonBlock className="mb-6 h-10 w-80 rounded-full" />
          <SkeletonBlock className="h-16 w-full max-w-3xl" />
          <SkeletonBlock className="mt-4 h-16 w-2/3 max-w-2xl" />
          <SkeletonBlock className="mt-8 h-6 w-full max-w-xl" />
          <SkeletonBlock className="mt-3 h-6 w-3/4 max-w-lg" />
          <div className="mt-10 flex gap-4">
            <SkeletonBlock className="h-12 w-44" />
            <SkeletonBlock className="h-12 w-40" />
          </div>
        </div>
      </section>
    </main>
  );
}

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const syncAuth = () => {
      const token = localStorage.getItem("token");
      setIsLoggedIn(!!token);
    };

    syncAuth();

    const t = setTimeout(() => setLoading(false), 900);

    window.addEventListener("storage", syncAuth);
    window.addEventListener("authChanged", syncAuth);

    return () => {
      clearTimeout(t);
      window.removeEventListener("storage", syncAuth);
      window.removeEventListener("authChanged", syncAuth);
    };
  }, []);

  if (loading) return <HomeSkeleton />;

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <style>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-20px) scale(1.04); }
        }

        @keyframes glowPulse {
          0%, 100% { opacity: .35; transform: scale(1); }
          50% { opacity: .7; transform: scale(1.08); }
        }

        .fade-up {
          opacity: 0;
          animation: fadeUp .8s ease forwards;
        }

        .delay-1 { animation-delay: .08s; }
        .delay-2 { animation-delay: .16s; }
        .delay-3 { animation-delay: .24s; }
        .delay-4 { animation-delay: .32s; }

        .hover-lift {
          transition: transform .25s ease, box-shadow .25s ease;
        }

        .hover-lift:hover {
          transform: translateY(-6px);
          box-shadow: 0 18px 40px rgba(16,185,129,0.12);
        }

        .float-orb {
          animation: floatSlow 8s ease-in-out infinite;
        }

        .glow-pulse {
          animation: glowPulse 4s ease-in-out infinite;
        }
      `}</style>

      <Header variant="landing" />

      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900">
        <div className="pointer-events-none absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-3xl float-orb" />
        <div className="pointer-events-none absolute -bottom-20 right-0 h-[400px] w-[400px] rounded-full bg-teal-400/10 blur-3xl float-orb" />
        <div className="pointer-events-none absolute left-[45%] top-[18%] h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl glow-pulse" />

        <div className="relative mx-auto max-w-6xl px-6 py-28 md:py-36">
          <div className="fade-up delay-1 mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            OTP-secured · Transparent · Community-first
          </div>

          <h1 className="fade-up delay-2 max-w-4xl text-5xl font-extrabold leading-[1.05] tracking-tight text-white md:text-7xl">
            Save together.{" "}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 bg-clip-text text-transparent">
              Trust each other.
            </span>
          </h1>

          <p className="fade-up delay-3 mt-6 max-w-2xl text-lg leading-relaxed text-slate-300 md:text-xl">
            CircleSave makes group savings transparent and secure. Create a
            circle, invite members, track every contribution, and receive
            payouts — all verified by OTP.
          </p>

          <div className="fade-up delay-4 mt-10 flex flex-wrap items-center gap-4">
            {isLoggedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className="rounded-2xl bg-emerald-500 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:scale-[1.03] hover:bg-emerald-400"
                >
                  Go to Dashboard →
                </Link>
                <span className="text-sm text-slate-400">
                  You are already signed in.
                </span>
              </>
            ) : (
              <>
                <Link
                  href="/auth/signup"
                  className="rounded-2xl bg-emerald-500 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:scale-[1.03] hover:bg-emerald-400"
                >
                  Create your savings circle →
                </Link>

                <span className="text-sm text-slate-400">
                  Already have an account?{" "}
                  <Link
                    href="/auth/login"
                    className="font-medium text-emerald-400 hover:underline"
                  >
                    Log in
                  </Link>
                </span>
              </>
            )}
          </div>

          <div className="fade-up delay-4 mt-14 grid gap-4 border-t border-white/10 pt-10 sm:grid-cols-3">
            {[
              "No funds held by us",
              "Every login OTP-verified",
              "Full contribution history",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-300 backdrop-blur-sm hover-lift"
              >
                <span className="mr-2 text-emerald-400">✓</span>
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <p className="fade-up text-xs font-semibold uppercase tracking-widest text-emerald-600">
            How it works
          </p>
          <h2 className="fade-up delay-1 mt-2 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
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
            ].map(({ step, title, desc, accent, bar }, i) => (
              <div
                key={step}
                className={`fade-up delay-${Math.min(
                  i + 1,
                  4
                )} group relative overflow-hidden rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200 hover-lift`}
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

      <section className="bg-white px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <div className="fade-up">
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
                Why CircleSave
              </p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
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
                ].map(([title, desc], i) => (
                  <li
                    key={title}
                    className={`fade-up delay-${Math.min(i + 1, 4)} flex items-start gap-3`}
                  >
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
              ].map(({ value, label, bg, text }, i) => (
                <div
                  key={label}
                  className={`fade-up delay-${Math.min(
                    i + 1,
                    4
                  )} rounded-3xl p-6 hover-lift ${bg}`}
                >
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

      <section className="relative overflow-hidden bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-20 text-center">
        <div className="pointer-events-none absolute left-10 top-0 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />

        <div className="mx-auto max-w-3xl">
          <h2 className="fade-up text-3xl font-extrabold text-white md:text-4xl">
            Ready to start your circle?
          </h2>
          <p className="fade-up delay-1 mt-3 text-base text-emerald-100">
            Free to join. No hidden fees. OTP-secured from day one.
          </p>

          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="fade-up delay-2 mt-8 inline-block rounded-2xl bg-white px-8 py-3.5 text-sm font-bold text-emerald-700 shadow-lg transition hover:scale-[1.03] hover:bg-emerald-50"
            >
              Open dashboard →
            </Link>
          ) : (
            <Link
              href="/auth/signup"
              className="fade-up delay-2 mt-8 inline-block rounded-2xl bg-white px-8 py-3.5 text-sm font-bold text-emerald-700 shadow-lg transition hover:scale-[1.03] hover:bg-emerald-50"
            >
              Create your account →
            </Link>
          )}
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-slate-950 px-6 py-10 text-center">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold text-white">CircleSave</p>
          <p className="mt-2 text-sm text-slate-400">
            Built for transparent, community-first savings circles.
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500">
            <Link href="/" className="hover:text-white">
              Home
            </Link>
            {isLoggedIn ? (
              <Link href="/dashboard" className="hover:text-white">
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/auth/login" className="hover:text-white">
                  Log in
                </Link>
                <Link href="/auth/signup" className="hover:text-white">
                  Sign up
                </Link>
              </>
            )}
          </div>

          <p className="mt-6 text-xs text-slate-500">
            © {new Date().getFullYear()} CircleSave · Built for community savings
          </p>
        </div>
      </footer>
    </main>
  );
}