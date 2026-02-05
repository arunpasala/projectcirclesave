"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("test1@gmail.com");
  const [password, setPassword] = useState("Pass@1234");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));
      setLoading(false);

      if (!res.ok) {
        setError(data?.error || "Login failed. Please try again.");
        return;
      }

      localStorage.setItem("token", data.token);
      router.push("/dashboard");
    } catch (err) {
      setLoading(false);
      setError("Network error. Is the server running?");
      console.error(err);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* LEFT PANEL */}
        <div className="cs-left" style={styles.left}>
          <div style={styles.brandRow}>
            <div style={styles.logoCircle}>C</div>
            <div style={styles.brandText}>CircleSave</div>
          </div>

          <h1 style={styles.hero}>
            Explore the things <span style={{ color: "#1877F2" }}>you love.</span>
          </h1>

          <p style={styles.subtext}>
            Create trusted savings circles, contribute on schedule, and track payouts with transparency.
          </p>

          <div style={styles.visualWrap}>
            <div style={styles.cardA} />
            <div style={styles.cardB} />
            <div style={styles.cardC} />
            <div style={styles.badge}>16:45</div>
            <div style={styles.avatarOuter}>
              <div style={styles.avatarInner}>🙂</div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={styles.right}>
          <div className="cs-mobileBrand" style={styles.mobileBrand}>
            <div style={styles.logoCircleSmall}>C</div>
            <div style={styles.brandText}>CircleSave</div>
          </div>

          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Log in</h2>
            <p style={styles.cardDesc}>Welcome back. Please enter your details.</p>

            <form onSubmit={handleLogin}>
              <div style={styles.field}>
                <label style={styles.label}>Email</label>
                <input
                  style={styles.input}
                  type="email"
                  placeholder="Email or mobile number"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Password</label>
                <div style={styles.passwordRow}>
                  <input
                    style={{ ...styles.input, marginBottom: 0, flex: 1 }}
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    style={styles.showBtn}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* inline error */}
              {error && <div style={styles.errorBox}>{error}</div>}

              <button
                type="submit"
                disabled={loading}
                style={{
                  ...styles.button,
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Logging in..." : "Log in"}
              </button>

              <div style={styles.linksRow}>
                <a href="#" style={styles.link}>
                  Forgot password?
                </a>
              </div>

              <div style={styles.divider} />

              <a href="/signup" style={styles.createBtn}>
                Create new account
              </a>

              <div style={styles.footer}>© {new Date().getFullYear()} CircleSave</div>
            </form>
          </div>

          <div style={styles.tip}>
            Tip: Verify your email with OTP during signup, then log in here.
          </div>
        </div>
      </div>

      {/* responsive */}
      <style jsx global>{`
        @media (max-width: 980px) {
          .cs-left {
            display: none !important;
          }
          .cs-mobileBrand {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f0f2f5",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    fontFamily:
      'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
  },
  container: {
    width: "100%",
    maxWidth: 1100,
    display: "grid",
    gridTemplateColumns: "1.1fr 0.9fr",
    gap: 48,
    alignItems: "center",
  },

  left: { display: "flex", flexDirection: "column", justifyContent: "center" },
  brandRow: { display: "flex", alignItems: "center", gap: 12 },
  logoCircle: {
    width: 52,
    height: 52,
    borderRadius: 999,
    background: "#1877F2",
    color: "#fff",
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 8px 20px rgba(24,119,242,0.25)",
    fontSize: 22,
  },
  logoCircleSmall: {
    width: 44,
    height: 44,
    borderRadius: 999,
    background: "#1877F2",
    color: "#fff",
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 8px 20px rgba(24,119,242,0.25)",
    fontSize: 20,
  },
  brandText: { fontSize: 18, fontWeight: 700, color: "#111827" },
  hero: {
    marginTop: 24,
    fontSize: 64,
    lineHeight: 1.05,
    fontWeight: 800,
    color: "#111827",
    letterSpacing: -1,
  },
  subtext: { marginTop: 18, fontSize: 18, color: "#4b5563", maxWidth: 520 },

  visualWrap: { marginTop: 32, position: "relative", height: 280 },
  cardA: {
    position: "absolute",
    left: 0,
    top: 40,
    width: 260,
    height: 180,
    borderRadius: 18,
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
  },
  cardB: {
    position: "absolute",
    left: 90,
    top: 0,
    width: 320,
    height: 240,
    borderRadius: 18,
    background: "linear-gradient(135deg, #dbeafe, #bfdbfe)",
    border: "1px solid #dbeafe",
    boxShadow: "0 18px 50px rgba(0,0,0,0.12)",
  },
  cardC: {
    position: "absolute",
    left: 40,
    top: 140,
    width: 320,
    height: 160,
    borderRadius: 18,
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    boxShadow: "0 12px 35px rgba(0,0,0,0.1)",
  },
  badge: {
    position: "absolute",
    left: 260,
    top: 48,
    background: "#1877F2",
    color: "#fff",
    padding: "8px 14px",
    borderRadius: 999,
    fontWeight: 700,
    fontSize: 14,
    boxShadow: "0 10px 25px rgba(24,119,242,0.25)",
  },
  avatarOuter: {
    position: "absolute",
    left: 220,
    top: 170,
    width: 72,
    height: 72,
    borderRadius: 999,
    background: "#fff",
    border: "1px solid #e5e7eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
  },
  avatarInner: {
    width: 56,
    height: 56,
    borderRadius: 999,
    background: "#1877F2",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontSize: 22,
  },

  right: { display: "flex", flexDirection: "column", alignItems: "center" },
  mobileBrand: { display: "none", alignItems: "center", gap: 10, marginBottom: 16 },

  card: {
    width: "100%",
    maxWidth: 420,
    background: "#fff",
    borderRadius: 16,
    border: "1px solid #e5e7eb",
    padding: 22,
    boxShadow: "0 18px 45px rgba(0,0,0,0.1)",
  },
  cardTitle: { fontSize: 26, fontWeight: 800, color: "#111827" },
  cardDesc: { marginTop: 6, fontSize: 14, color: "#6b7280" },

  field: { marginTop: 14 },
  label: { display: "block", fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 6 },

  input: {
    width: "100%",
    height: 48,
    borderRadius: 12,
    border: "1px solid #d1d5db",
    padding: "0 14px",
    fontSize: 15,
    outline: "none",
  },

  passwordRow: { display: "flex", gap: 10, alignItems: "center" },
  showBtn: {
    height: 48,
    padding: "0 12px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    background: "#fff",
    fontWeight: 700,
    color: "#111827",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  errorBox: {
    marginTop: 12,
    padding: "10px 12px",
    borderRadius: 12,
    background: "#FEF2F2",
    border: "1px solid #FECACA",
    color: "#991B1B",
    fontSize: 14,
    fontWeight: 600,
  },

  button: {
    width: "100%",
    height: 48,
    borderRadius: 12,
    border: "none",
    marginTop: 16,
    background: "#1877F2",
    color: "#fff",
    fontWeight: 800,
    fontSize: 16,
    boxShadow: "0 12px 28px rgba(24,119,242,0.25)",
  },

  linksRow: { display: "flex", justifyContent: "center", marginTop: 14 },
  link: { color: "#1877F2", fontSize: 14, fontWeight: 700, textDecoration: "none" },

  divider: { height: 1, background: "#e5e7eb", margin: "16px 0" },

  createBtn: {
    display: "block",
    width: "100%",
    height: 48,
    borderRadius: 12,
    border: "1px solid #1877F2",
    color: "#1877F2",
    fontWeight: 800,
    textAlign: "center",
    lineHeight: "48px",
    textDecoration: "none",
    background: "#fff",
  },

  footer: { marginTop: 14, fontSize: 12, textAlign: "center", color: "#6b7280" },
  tip: { marginTop: 18, fontSize: 13, color: "#6b7280", textAlign: "center", maxWidth: 420 },
};
