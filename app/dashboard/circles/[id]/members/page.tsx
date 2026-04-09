"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  DashboardShell,
  Section,
  GlassCard,
  Badge,
} from "@/components/ui/dashboard-shell";

type Member = {
  id: number;
  user_auth_id: string;
  role: string;
  status: string;
  name: string;
  email: string;
  joined_at?: string | null;
};

type ApiResponse = {
  isOwner: boolean;
  members: Member[];
};

type JwtPayload = {
  userId: string;
  authUserId?: string;
  exp?: number;
};

function parseJwt(token: string): JwtPayload | null {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => `%${("00" + c.charCodeAt(0).toString(16)).slice(-2)}`)
        .join("")
    );

    return JSON.parse(json);
  } catch {
    return null;
  }
}

export default function MembersPage() {
  const router = useRouter();
  const params = useParams();
  const circleId = Number(params?.id);

  const [token, setToken] = useState("");
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loading, setLoading] = useState(true);

  const [members, setMembers] = useState<Member[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const payload = storedToken ? parseJwt(storedToken) : null;

    if (!storedToken || !payload?.userId) {
      router.replace("/auth/login");
      return;
    }

    if (payload.exp && Date.now() >= payload.exp * 1000) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.replace("/auth/login");
      return;
    }

    setToken(storedToken);
    setLoadingAuth(false);
  }, [router]);

  const authHeaders = useMemo(
    () => ({
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token]
  );

  const loadMembers = async () => {
    if (!circleId || !token) return;

    setLoading(true);
    setErr("");

    try {
      const res = await fetch(`/api/circles/${circleId}/members`, {
        headers: authHeaders,
      });

      const data: ApiResponse = await res.json();

      if (!res.ok) {
        throw new Error((data as any)?.error || "Failed to load members");
      }

      setMembers(data.members || []);
      setIsOwner(data.isOwner);
    } catch (e: any) {
      setErr(e?.message || "Failed to load members");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loadingAuth && token && circleId) {
      loadMembers();
    }
  }, [loadingAuth, token, circleId]);

  if (loadingAuth || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <p className="text-white/60">Loading members...</p>
      </div>
    );
  }

  return (
    <DashboardShell
      title="Members"
      subtitle={
        isOwner
          ? "View and manage all members"
          : "Only approved members are visible"
      }
      userLabel="Arun"
      actions={
        <Link
          href={`/dashboard/circles/${circleId}`}
          className="rounded-xl px-3 py-2 text-xs"
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "white",
          }}
        >
          ← Back
        </Link>
      }
    >
      {err && <div className="text-rose-300 text-sm mb-4">{err}</div>}

      <Section title="Circle Members" count={members.length}>
        {members.length === 0 ? (
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
                    <Badge
                      variant={
                        m.status === "APPROVED"
                          ? "success"
                          : m.status === "PENDING"
                          ? "warning"
                          : "danger"
                      }
                    >
                      {m.status}
                    </Badge>

                    <p className="text-white/40 text-xs mt-1">{m.role}</p>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </Section>
    </DashboardShell>
  );
}