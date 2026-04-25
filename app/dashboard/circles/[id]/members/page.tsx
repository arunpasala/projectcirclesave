"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Member = {
  id: number;
  name: string;
  email: string;
  status: string;
  joined_at?: string | null;
};

function Badge({
  children,
  color,
}: {
  children: React.ReactNode;
  color: "blue" | "emerald" | "rose" | "slate" | "amber";
}) {
  const styles = {
    blue: "bg-blue-500/15 text-blue-300",
    emerald: "bg-emerald-500/15 text-emerald-300",
    rose: "bg-rose-500/15 text-rose-300",
    slate: "bg-white/10 text-white/70",
    amber: "bg-amber-500/15 text-amber-300",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${styles[color]}`}
    >
      {children}
    </span>
  );
}

function GlassCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
      {children}
    </div>
  );
}

export default function MembersPage() {
  const params = useParams();
  const circleId = params?.id;

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMembers = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await fetch(`/api/circles/${circleId}/members`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        setMembers(data.members || []);
      } catch (error) {
        console.error("Failed to load members");
      } finally {
        setLoading(false);
      }
    };

    if (circleId) loadMembers();
  }, [circleId]);

  return (
    <div className="p-6 text-white">
      <h1 className="mb-4 text-2xl font-bold">Circle Members</h1>

      {loading ? (
        <p className="text-white/50 text-sm">Loading...</p>
      ) : members.length === 0 ? (
        <GlassCard>
          <p className="text-white/50 text-sm">No members found</p>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {members.map((m) => (
            <GlassCard key={m.id}>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-white font-bold">{m.name}</p>
                  <p className="text-white/50 text-sm">{m.email}</p>

                  {m.joined_at && (
                    <p className="text-white/40 text-xs">
                      Joined {new Date(m.joined_at).toLocaleString()}
                    </p>
                  )}
                </div>

                <div className="text-right">
                  {/* ✅ FIXED BADGE */}
                  <Badge
                    color={
                      m.status === "APPROVED"
                        ? "emerald"
                        : m.status === "PENDING"
                        ? "amber"
                        : m.status === "REJECTED"
                        ? "rose"
                        : "slate"
                    }
                  >
                    {m.status}
                  </Badge>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}