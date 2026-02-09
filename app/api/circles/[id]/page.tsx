"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { getToken, logout } from "@/lib/client-auth";

type Circle = {
  id: number;
  owner_id: number;
  name: string;
  contribution_amount: string;
  created_at: string;
  isOwner: boolean;
};

type Member = {
  user_id: number;
  full_name: string;
  email: string;
  role: string;
  status: string;
  joined_at: string;
};

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function CircleDetailsPage({ params }: { params: { id: string } }) {
  const token = useMemo(() => getToken(), []);
  const circleId = Number(params.id);

  const [circle, setCircle] = useState<Circle | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState("");

  // Poll (frontend-only)
  const pollOptions = ["Rotation", "Random", "Wheel"];
  const [votes, setVotes] = useState<Record<string, number>>({
    Rotation: 0,
    Random: 0,
    Wheel: 0,
  });
  const [voted, setVoted] = useState(false);

  // Wheel (frontend-only)
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [spinResult, setSpinResult] = useState<string>("");
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    if (!token) {
      window.location.href = "/login";
      return;
    }
  }, [token]);

  useEffect(() => {
    if (!token || !Number.isFinite(circleId)) return;

    const load = async () => {
      setError("");
      try {
        const cRes = await fetch(`/api/circles/${circleId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!cRes.ok) {
          const data = await cRes.json().catch(() => ({}));
          throw new Error(data?.error || `Failed to load circle (${cRes.status})`);
        }
        const cData = await cRes.json();
        setCircle(cData.circle);

        const mRes = await fetch(`/api/circles/${circleId}/members`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!mRes.ok) {
          const data = await mRes.json().catch(() => ({}));
          throw new Error(data?.error || `Failed to load members (${mRes.status})`);
        }
        const mData = await mRes.json();
        setMembers(mData.members || []);
      } catch (e: any) {
        setError(e?.message || "Something went wrong");
      }
    };

    load();
  }, [token, circleId]);

  // Draw simple wheel from APPROVED members
  useEffect(() => {
    const approved = members.filter((m) => m.status === "APPROVED");
    const names = approved.map((m) => m.full_name);
    drawWheel(names);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members]);

  const drawWheel = (names: string[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 8;

    ctx.clearRect(0, 0, size, size);

    // background
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fillStyle = "#0b1220";
    ctx.fill();

    if (names.length === 0) {
      ctx.fillStyle = "#cbd5e1";
      ctx.font = "16px ui-sans-serif, system-ui";
      ctx.textAlign = "center";
      ctx.fillText("No approved members", center, center);
      return;
    }

    const slice = (Math.PI * 2) / names.length;

    for (let i = 0; i < names.length; i++) {
      const start = i * slice;
      const end = start + slice;

      // alternating slices
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, start, end);
      ctx.closePath();
      ctx.fillStyle = i % 2 === 0 ? "#111827" : "#0f172a";
      ctx.fill();

      // text
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(start + slice / 2);
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "12px ui-sans-serif, system-ui";
      ctx.textAlign = "right";
      ctx.fillText(names[i].slice(0, 16), radius - 14, 4);
      ctx.restore();
    }

    // pointer
    ctx.beginPath();
    ctx.moveTo(center, 6);
    ctx.lineTo(center - 10, 26);
    ctx.lineTo(center + 10, 26);
    ctx.closePath();
    ctx.fillStyle = "#f8fafc";
    ctx.fill();
  };

  const handleVote = (opt: string) => {
    if (voted) return;
    setVotes((v) => ({ ...v, [opt]: (v[opt] || 0) + 1 }));
    setVoted(true);
  };

  const spin = async () => {
    const approved = members.filter((m) => m.status === "APPROVED");
    if (approved.length === 0) return;

    setSpinning(true);
    setSpinResult("");

    // simple fake animation delay
    await new Promise((r) => setTimeout(r, 900));

    const winner = approved[Math.floor(Math.random() * approved.length)];
    setSpinResult(`${winner.full_name} 🎉`);
    setSpinning(false);
  };

  const approvedCount = members.filter((m) => m.status === "APPROVED").length;
  const pendingCount = members.filter((m) => m.status === "PENDING").length;

  return (
    <main className="min-h-screen bg-[#0b1220] text-slate-100">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b1220]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white/10 ring-1 ring-white/10" />
            <div className="leading-tight">
              <div className="text-sm font-semibold">CircleSave</div>
              <div className="text-[11px] text-slate-300">Circle details</div>
            </div>
          </Link>

          <button
            onClick={() => {
              logout();
              window.location.href = "/login";
            }}
            className="rounded-xl bg-white/10 px-4 py-2 text-sm font-medium ring-1 ring-white/10 hover:bg-white/15"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-6 md:grid-cols-[1.25fr_.75fr]">
        {/* Left */}
        <section className="space-y-4">
          {/* Circle “profile card” */}
          <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-white/10 ring-1 ring-white/10" />
                <div>
                  <div className="text-lg font-semibold">
                    {circle?.name || "Loading..."}
                  </div>
                  <div className="mt-1 text-sm text-slate-300">
                    Contribution:{" "}
                    <span className="font-medium text-slate-100">
                      ${circle?.contribution_amount ?? "—"}
                    </span>
                    <span className="mx-2 text-slate-500">•</span>
                    Members:{" "}
                    <span className="font-medium text-slate-100">
                      {approvedCount}
                    </span>
                    {pendingCount > 0 ? (
                      <>
                        <span className="mx-2 text-slate-500">•</span>
                        Pending:{" "}
                        <span className="font-medium text-amber-200">
                          {pendingCount}
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <span
                  className={classNames(
                    "rounded-full px-3 py-1 text-xs font-semibold ring-1",
                    circle?.isOwner
                      ? "bg-emerald-500/15 text-emerald-200 ring-emerald-400/20"
                      : "bg-white/10 text-slate-200 ring-white/10"
                  )}
                >
                  {circle?.isOwner ? "Owner" : "Member"}
                </span>

                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold ring-1 ring-white/10">
                  Circle #{circleId}
                </span>
              </div>
            </div>

            {error ? (
              <div className="mt-4 rounded-2xl bg-rose-500/10 p-3 text-sm text-rose-200 ring-1 ring-rose-400/20">
                {error}
              </div>
            ) : null}
          </div>

          {/* Members list */}
          <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Members</h2>
              <span className="text-xs text-slate-300">
                Approved: {approvedCount}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {members.length === 0 ? (
                <div className="text-sm text-slate-300">No members found.</div>
              ) : (
                members.map((m) => (
                  <div
                    key={m.user_id}
                    className="rounded-2xl bg-[#0f172a] p-4 ring-1 ring-white/10"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">{m.full_name}</div>
                        <div className="text-xs text-slate-400">{m.email}</div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={classNames(
                            "rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1",
                            m.status === "APPROVED"
                              ? "bg-emerald-500/15 text-emerald-200 ring-emerald-400/20"
                              : "bg-amber-500/15 text-amber-200 ring-amber-400/20"
                          )}
                        >
                          {m.status}
                        </span>
                        <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold ring-1 ring-white/10">
                          {m.role}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Right */}
        <aside className="space-y-4">
          {/* Poll card */}
          <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
            <h2 className="text-sm font-semibold">Monthly payout method poll</h2>
            <p className="mt-1 text-xs text-slate-300">
              (MVP) This is frontend-only right now. Next we’ll store votes in DB.
            </p>

            <div className="mt-4 space-y-2">
              {pollOptions.map((opt) => (
                <button
                  key={opt}
                  disabled={voted}
                  onClick={() => handleVote(opt)}
                  className={classNames(
                    "w-full rounded-2xl p-3 text-left text-sm ring-1 transition",
                    voted
                      ? "cursor-not-allowed bg-white/5 text-slate-400 ring-white/10"
                      : "bg-[#0f172a] hover:bg-white/10 ring-white/10"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{opt}</span>
                    <span className="text-xs text-slate-300">{votes[opt] || 0}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Wheel card */}
          <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
            <h2 className="text-sm font-semibold">Wheel pick (demo)</h2>
            <p className="mt-1 text-xs text-slate-300">
              Spins from **APPROVED** members only.
            </p>

            <div className="mt-4 flex items-center justify-center">
              <canvas
                ref={canvasRef}
                width={260}
                height={260}
                className="rounded-3xl bg-[#0f172a] ring-1 ring-white/10"
              />
            </div>

            <button
              onClick={spin}
              disabled={spinning || approvedCount === 0}
              className={classNames(
                "mt-4 w-full rounded-2xl px-4 py-3 text-sm font-semibold ring-1 transition",
                spinning || approvedCount === 0
                  ? "cursor-not-allowed bg-white/5 text-slate-400 ring-white/10"
                  : "bg-white text-[#0b1220] hover:bg-white/90 ring-white/20"
              )}
            >
              {spinning ? "Spinning..." : "Spin now"}
            </button>

            {spinResult ? (
              <div className="mt-3 rounded-2xl bg-emerald-500/10 p-3 text-sm text-emerald-200 ring-1 ring-emerald-400/20">
                Winner: <span className="font-semibold">{spinResult}</span>
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      <footer className="mx-auto max-w-6xl px-4 pb-8 text-xs text-slate-400">
        CircleSave • MVP circle details page
      </footer>
    </main>
  );
}
