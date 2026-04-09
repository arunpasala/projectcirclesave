"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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

function cls(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
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
        method: "GET",
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
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
          <p className="mt-4 text-sm text-slate-500">Loading members…</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6">
          <Link
            href={`/dashboard/circles/${circleId}`}
            className="text-sm text-emerald-700 hover:text-emerald-600"
          >
            ← Back to Circle
          </Link>

          <h1 className="mt-2 text-3xl font-bold">Members</h1>
          <p className="text-sm text-slate-500">
            {isOwner
              ? "You can view all members including pending requests"
              : "Only approved members are visible"}
          </p>
        </div>

        {err ? (
          <div className="mb-4 rounded-xl bg-red-100 px-4 py-2 text-sm text-red-700">
            {err}
          </div>
        ) : null}

        {members.length === 0 ? (
          <div className="rounded-xl bg-white p-6 text-sm text-slate-500 shadow">
            No members found.
          </div>
        ) : (
          <div className="space-y-4">
            {members.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-xl bg-white p-4 shadow"
              >
                <div>
                  <p className="font-semibold text-slate-900">{m.name}</p>
                  <p className="text-sm text-slate-500">{m.email}</p>

                  {m.joined_at ? (
                    <p className="mt-1 text-xs text-slate-400">
                      Joined: {new Date(m.joined_at).toLocaleString()}
                    </p>
                  ) : null}
                </div>

                <div className="text-right">
                  <span
                    className={cls(
                      "rounded-full px-3 py-1 text-xs font-semibold",
                      m.status === "APPROVED" && "bg-green-100 text-green-700",
                      m.status === "PENDING" && "bg-yellow-100 text-yellow-700",
                      m.status === "REJECTED" && "bg-red-100 text-red-700"
                    )}
                  >
                    {m.status}
                  </span>

                  <p className="mt-1 text-xs text-slate-400">{m.role}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}