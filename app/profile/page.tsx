"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type JwtPayload = {
  userId: string;
  authUserId?: string;
  email?: string;
  role?: string;
  exp?: number;
};

type Profile = {
  id: number;
  email: string;
  full_name: string | null;
  role: string | null;
  auth_user_id: string;
  created_at: string | null;
  is_verified: boolean | null;
  email_verified: boolean | null;
  avatar_url?: string | null;
  phone?: string | null;
  bio?: string | null;
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

    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function getInitial(name?: string | null, email?: string | null) {
  const text = (name || email || "U").trim();
  return text.charAt(0).toUpperCase();
}

export default function ProfilePage() {
  const router = useRouter();

  const [token, setToken] = useState("");
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState<Profile | null>(null);

  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");

  const [msg, setMsg] = useState("");
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
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token]
  );

  const loadProfile = async () => {
    if (!token) return;

    setLoadingProfile(true);
    setErr("");
    setMsg("");

    try {
      const res = await fetch("/api/profile", {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to load profile");
      }

      setProfile(data.profile);
      setFullName(data.profile?.full_name || "");
      setAvatarUrl(data.profile?.avatar_url || "");
      setPhone(data.profile?.phone || "");
      setBio(data.profile?.bio || "");
    } catch (error: any) {
      setErr(error?.message || "Failed to load profile");
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    if (!loadingAuth && token) {
      loadProfile();
    }
  }, [loadingAuth, token]);

  const onSave = async () => {
    if (!token) return;

    setSaving(true);
    setErr("");
    setMsg("");

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({
          full_name: fullName,
          avatar_url: avatarUrl,
          phone,
          bio,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to update profile");
      }

      setProfile(data.profile);
      setMsg(data?.message || "Profile updated successfully");
    } catch (error: any) {
      setErr(error?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loadingAuth || loadingProfile) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{
          background:
            "linear-gradient(135deg, #0f172a 0%, #134e4a 50%, #0f172a 100%)",
        }}
      >
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-emerald-800 border-t-emerald-400" />
          <p className="mt-4 text-sm text-white/60">Loading account...</p>
        </div>
      </div>
    );
  }

  return (
    <main
      className="min-h-screen p-6"
      style={{
        background:
          "linear-gradient(135deg, #0f172a 0%, #134e4a 50%, #0f172a 100%)",
      }}
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-4">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-emerald-400 hover:text-emerald-300"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">Your Account</h1>
          <p className="mt-2 text-sm text-white/60">
            View and update your profile details.
          </p>
        </div>

        {err ? (
          <div
            className="mb-4 rounded-2xl px-4 py-3 text-sm"
            style={{
              background: "rgba(244,63,94,0.12)",
              border: "1px solid rgba(244,63,94,0.3)",
              backdropFilter: "blur(12px)",
              color: "#fda4af",
            }}
          >
            {err}
          </div>
        ) : null}

        {msg ? (
          <div
            className="mb-4 rounded-2xl px-4 py-3 text-sm"
            style={{
              background: "rgba(16,185,129,0.12)",
              border: "1px solid rgba(16,185,129,0.3)",
              backdropFilter: "blur(12px)",
              color: "#6ee7b7",
            }}
          >
            {msg}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-3">
          <div
            className="rounded-3xl border border-white/10 p-6 text-white shadow-xl"
            style={{
              background: "rgba(255,255,255,0.05)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
            }}
          >
            <div className="flex flex-col items-center text-center">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="h-24 w-24 rounded-full object-cover border border-white/10"
                />
              ) : (
                <div
                  className="flex h-24 w-24 items-center justify-center rounded-full text-3xl font-bold text-white"
                  style={{
                    background: "linear-gradient(135deg, #10b981, #059669)",
                  }}
                >
                  {getInitial(profile?.full_name, profile?.email)}
                </div>
              )}

              <h2 className="mt-4 text-xl font-semibold text-white">
                {profile?.full_name || "User"}
              </h2>
              <p className="mt-1 text-sm text-white/60">{profile?.email}</p>

              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
                  Role: {profile?.role || "User"}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
                  Verified: {profile?.email_verified ? "Yes" : "No"}
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-3 text-sm text-white/70">
              <div>
                <p className="text-white/45">Account Created</p>
                <p>{formatDate(profile?.created_at)}</p>
              </div>
              <div>
                <p className="text-white/45">Auth User ID</p>
                <p className="break-all">{profile?.auth_user_id || "—"}</p>
              </div>
            </div>
          </div>

          <div
            className="lg:col-span-2 rounded-3xl border border-white/10 p-6 text-white shadow-xl"
            style={{
              background: "rgba(255,255,255,0.05)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
            }}
          >
            <h2 className="text-xl font-semibold">Edit Profile</h2>
            <p className="mt-2 text-sm text-white/60">
              Update your basic account information below.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm text-white/70">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/30"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm text-white/70">Avatar URL</label>
                <input
                  type="text"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="Paste image URL for your profile photo"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/30"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/70">Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter phone number"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/30"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/70">Email</label>
                <input
                  type="text"
                  value={profile?.email || ""}
                  readOnly
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white/70 outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm text-white/70">Bio</label>
                <textarea
                  rows={5}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Write a short bio"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/30"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="rounded-2xl px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  border: "1px solid rgba(16,185,129,0.35)",
                }}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>

              <button
                type="button"
                onClick={loadProfile}
                disabled={saving}
                className="rounded-2xl px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}