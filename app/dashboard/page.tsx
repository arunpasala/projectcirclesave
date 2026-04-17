"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  fetchMyCircles,
  fetchAllCircles,
  fetchCircleRequests,
  decideMember,
} from "@/lib/api/circles";
import {
  fetchNotifications,
  markNotificationRead,
} from "@/lib/api/notifications";

type CircleRow = {
  id: number;
  name: string;
  contribution_amount: number;
  created_at: string;
  owner_auth_id: string;
  membership_role?: string | null;
  membership_status?: string | null;
  joined_at?: string | null;
};

type RequestRow = {
  id: number;
  circle_id: number;
  user_auth_id: string;
  role: string;
  status: string;
  requested_at: string | null;
  joined_at?: string | null;
  decided_at?: string | null;
  circle_name?: string | null;
  requester?: {
    id: string;
    email: string | null;
    full_name: string | null;
  } | null;
};

type NotificationRow = {
  id: number;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  type?: string | null;
  meta?: Record<string, unknown> | null;
};

type JwtPayload = {
  userId: string;
  authUserId?: string;
  email: string;
  role?: string;
  exp?: number;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function cls(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function Badge({
  children,
  color,
}: {
  children: React.ReactNode;
  color: "emerald" | "blue" | "rose" | "slate" | "amber";
}) {
  const map = {
    emerald:
      "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30 backdrop-blur-sm",
    blue: "bg-blue-500/10 text-blue-300 ring-blue-500/30 backdrop-blur-sm",
    rose: "bg-rose-500/10 text-rose-300 ring-rose-500/30 backdrop-blur-sm",
    slate: "bg-white/5 text-slate-300 ring-white/10 backdrop-blur-sm",
    amber:
      "bg-amber-500/10 text-amber-300 ring-amber-500/30 backdrop-blur-sm",
  };

  return (
    <span
      className={cls(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1",
        map[color]
      )}
    >
      {children}
    </span>
  );
}

function Section({
  title,
  subtitle,
  count,
  open,
  onToggle,
  children,
}: {
  title: string;
  subtitle?: string;
  count?: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="overflow-hidden rounded-3xl transition-all duration-300"
      style={{
        background: "rgba(255,255,255,0.06)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow:
          "0 4px 24px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.08)",
      }}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors duration-200"
        style={{ background: "transparent" }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "rgba(255,255,255,0.04)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = "transparent")
        }
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">{title}</span>
            {count !== undefined ? (
              <span
                className="rounded-full px-2 py-0.5 text-xs font-semibold"
                style={{
                  background: "rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.7)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                {count}
              </span>
            ) : null}
          </div>
          {subtitle ? (
            <p
              className="mt-0.5 text-xs"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
        <span
          className="transition-transform duration-300"
          style={{
            color: "rgba(255,255,255,0.4)",
            display: "inline-block",
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
          }}
        >
          ▸
        </span>
      </button>

      <div
        style={{
          overflow: "hidden",
          maxHeight: open ? "9999px" : "0",
          transition: "max-height 0.35s ease",
        }}
      >
        <div
          className="px-6 py-5"
          style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
        >
          {children}
        </div>
        
      </div>
    </div>
  );
}

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

function ChatbotWidget({
  myCircles,
  allCircles,
  requests,
  notifications,
  userName,
}: {
  myCircles: CircleRow[];
  allCircles: CircleRow[];
  requests: RequestRow[];
  notifications: NotificationRow[];
  userName: string;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: `Hi${userName ? ` ${userName}` : ""}, I’m CircleSave Assistant. Ask me about joining circles, requests, payouts, notifications, or dashboard status.`,
    },
  ]);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const context = useMemo(
    () => ({
      myCirclesCount: myCircles.length,
      allCirclesCount: allCircles.length,
      pendingRequestsCount: requests.length,
      unreadNotificationsCount: notifications.filter((n) => !n.read).length,
      myCircleNames: myCircles.map((c) => c.name),
      availableCircleNames: allCircles.map((c) => c.name),
    }),
    [myCircles, allCircles, requests, notifications]
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    const newUserMessage: ChatMessage = { role: "user", content: trimmed };
    const nextMessages = [...messages, newUserMessage];

    setMessages(nextMessages);
    setInput("");
    setSending(true);

    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          message: trimmed,
          context,
        }),
      });

      const data = await res.json().catch(() => ({}));

      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content:
            data?.reply || "Sorry, I could not process that request right now.",
        },
      ]);
    } catch {
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: "Something went wrong while contacting the assistant.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 rounded-full px-5 py-3 text-sm font-bold text-white shadow-2xl"
          style={{
            background: "linear-gradient(135deg, #10b981, #059669)",
            border: "1px solid rgba(255,255,255,0.18)",
            boxShadow: "0 12px 30px rgba(16,185,129,0.35)",
          }}
        >
          Chat with CircleSave
        </button>
      ) : (
        <div
          className="fixed bottom-5 right-5 z-50 flex h-[560px] w-[380px] flex-col overflow-hidden rounded-3xl"
          style={{
            background: "rgba(15,23,42,0.82)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.14)",
            boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-4"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div>
              <h3 className="text-sm font-bold text-white">
                CircleSave Assistant
              </h3>
              <p
                className="text-xs"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                Help, guidance, and dashboard answers
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-xl px-3 py-1.5 text-xs font-semibold text-white"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              Close
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6"
                  style={
                    msg.role === "user"
                      ? {
                          background: "rgba(16,185,129,0.9)",
                          color: "#ffffff",
                        }
                      : {
                          background: "rgba(255,255,255,0.08)",
                          color: "rgba(255,255,255,0.88)",
                          border: "1px solid rgba(255,255,255,0.10)",
                        }
                  }
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {sending ? (
              <div className="flex justify-start">
                <div
                  className="rounded-2xl px-4 py-3 text-sm"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.7)",
                    border: "1px solid rgba(255,255,255,0.10)",
                  }}
                >
                  Thinking...
                </div>
              </div>
            ) : null}

            <div ref={bottomRef} />
          </div>

          <div
            className="px-4 py-4"
            style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="mb-3 flex flex-wrap gap-2">
              {[
                "How do I join a circle?",
                "Why is my cycle locked?",
                "Who can approve requests?",
                "What can I do on this dashboard?",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="rounded-full px-3 py-1.5 text-[11px] font-medium text-white"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.10)",
                  }}
                >
                  {q}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendMessage();
                }}
                placeholder="Ask something..."
                className="flex-1 rounded-2xl px-4 py-3 text-sm text-white outline-none"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.10)",
                }}
              />
              <button
                onClick={sendMessage}
                disabled={sending}
                className="rounded-2xl px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  border: "1px solid rgba(255,255,255,0.14)",
                }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
        
      )}
    </>
  );
}
type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function SmallChatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hi, I’m CircleSave Assistant." },
  ]);
  const [sending, setSending] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;

    const currentInput = input;
    const userMessage: ChatMessage = { role: "user", content: currentInput };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: currentInput }),
      });

      const data = await res.json();

      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: data.reply || "No response from chatbot.",
        },
      ]);
    } catch {
      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: "Chatbot request failed.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <style jsx>{`
        .cs-glass-chatbot {
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          background: rgba(15, 23, 42, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
          transition: all 0.3s ease;
        }

        .cs-glass-header {
          background: linear-gradient(
            135deg,
            rgba(16, 185, 129, 0.78),
            rgba(5, 150, 105, 0.72)
          );
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .cs-chat-body {
          background: linear-gradient(
            180deg,
            rgba(2, 6, 23, 0.35),
            rgba(15, 23, 42, 0.18)
          );
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }

        .cs-bot-bubble {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          color: white;
        }

        .cs-user-bubble {
          background: linear-gradient(135deg, #10b981, #059669);
          box-shadow: 0 0 12px rgba(16, 185, 129, 0.45);
          color: white;
        }

        .cs-chat-input {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.14);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          color: white;
        }

        .cs-chat-input::placeholder {
          color: rgba(255, 255, 255, 0.55);
        }

        .cs-send-btn {
          background: linear-gradient(135deg, #10b981, #059669);
          box-shadow: 0 0 12px rgba(16, 185, 129, 0.45);
          color: white;
        }

        .cs-send-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 0 16px rgba(16, 185, 129, 0.55);
        }

        .cs-open-btn {
          background: linear-gradient(135deg, #10b981, #059669);
          box-shadow: 0 0 14px rgba(16, 185, 129, 0.45);
          color: white;
        }

        .cs-dots {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          height: 14px;
        }

        .cs-dots span {
          width: 6px;
          height: 6px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.9);
          animation: cs-bounce 1.2s infinite ease-in-out;
        }

        .cs-dots span:nth-child(2) {
          animation-delay: 0.15s;
        }

        .cs-dots span:nth-child(3) {
          animation-delay: 0.3s;
        }

        @keyframes cs-bounce {
          0%,
          80%,
          100% {
            transform: scale(0.7);
            opacity: 0.45;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>

      <div
        className="cs-glass-chatbot"
        style={{
          position: "fixed",
          right: "20px",
          bottom: "20px",
          width: open ? "320px" : "56px",
          height: open ? "420px" : "56px",
          borderRadius: "16px",
          zIndex: 99999,
          overflow: "hidden",
        }}
      >
        {!open ? (
          <button
            onClick={() => setOpen(true)}
            className="cs-open-btn"
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              cursor: "pointer",
              fontSize: "24px",
              fontWeight: "bold",
              borderRadius: "16px",
            }}
          >
            💬
          </button>
        ) : (
          <>
            <div
              className="cs-glass-header"
              style={{
                padding: "10px 12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontWeight: 700,
              }}
            >
              <span style={{ fontSize: "14px", color: "white" }}>
                CircleSave Chat
              </span>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: "rgba(255,255,255,0.85)",
                  color: "#059669",
                  border: "none",
                  borderRadius: "8px",
                  padding: "2px 8px",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                ×
              </button>
            </div>

            <div
              className="cs-chat-body"
              style={{
                height: "310px",
                overflowY: "auto",
                padding: "10px",
              }}
            >
              {messages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    textAlign: msg.role === "user" ? "right" : "left",
                    marginBottom: "8px",
                  }}
                >
                  <span
                    className={
                      msg.role === "user" ? "cs-user-bubble" : "cs-bot-bubble"
                    }
                    style={{
                      display: "inline-block",
                      maxWidth: "80%",
                      padding: "8px 10px",
                      borderRadius: "12px",
                      fontSize: "13px",
                      wordBreak: "break-word",
                    }}
                  >
                    {msg.content}
                  </span>
                </div>
              ))}

              {sending && (
                <div style={{ textAlign: "left", marginBottom: "8px" }}>
                  <span
                    className="cs-bot-bubble"
                    style={{
                      display: "inline-block",
                      padding: "10px 12px",
                      borderRadius: "12px",
                    }}
                  >
                    <span className="cs-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </span>
                  </span>
                </div>
              )}
            </div>

            <div
              style={{
                padding: "10px",
                borderTop: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                gap: "8px",
                background: "rgba(15, 23, 42, 0.35)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendMessage();
                }}
                placeholder="Ask..."
                className="cs-chat-input"
                style={{
                  flex: 1,
                  padding: "8px 10px",
                  borderRadius: "10px",
                  outline: "none",
                  fontSize: "13px",
                }}
              />
              <button
                onClick={sendMessage}
                className="cs-send-btn"
                style={{
                  border: "none",
                  borderRadius: "10px",
                  padding: "8px 12px",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: "13px",
                }}
              >
                {sending ? "..." : "Send"}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default function DashboardPage() {
  const router = useRouter();

  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");

  const [myCircles, setMyCircles] = useState<CircleRow[]>([]);
  const [allCircles, setAllCircles] = useState<CircleRow[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [pendingMine, setPendingMine] = useState<RequestRow[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);

  const [authChecking, setAuthChecking] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [busyJoinId, setBusyJoinId] = useState<number | null>(null);
  const [busyDecisionId, setBusyDecisionId] = useState<number | null>(null);
  const [busyNotificationId, setBusyNotificationId] = useState<number | null>(
    null
  );

  const [openMy, setOpenMy] = useState(true);
  const [openAll, setOpenAll] = useState(true);
  const [openReq, setOpenReq] = useState(true);
  const [openNotif, setOpenNotif] = useState(true);
  const [openAdmin, setOpenAdmin] = useState(true);

  useEffect(() => {
    const init = () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          router.replace("/auth/login");
          return;
        }

        const payload = parseJwt(token);

        if (!payload?.userId || !payload?.email) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          router.replace("/auth/login");
          return;
        }

        if (payload.exp && Date.now() >= payload.exp * 1000) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          router.replace("/auth/login");
          return;
        }

        const savedUser = localStorage.getItem("user");
        let fullName = "";

        if (savedUser) {
          try {
            const parsedUser = JSON.parse(savedUser);
            fullName = parsedUser?.full_name || "";
          } catch {}
        }

        setUserId(payload.userId);
        setUserEmail(payload.email);
        setUserName(fullName);
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.replace("/auth/login");
        return;
      } finally {
        setAuthChecking(false);
      }
    };

    init();
  }, [router]);

  const reload = async (showLoader = true) => {
    setErr("");
    setMsg("");
    if (showLoader) setDataLoading(true);

    try {
      const [myRes, allRes, reqRes, notifRes] = await Promise.all([
        fetchMyCircles(),
        fetchAllCircles(),
        fetchCircleRequests(),
        fetchNotifications(),
      ]);

      setMyCircles(myRes.circles || []);
      setAllCircles(allRes.circles || []);
      setRequests(reqRes.requests || []);
      setPendingMine(reqRes.pendingMine || []);
      setNotifications(notifRes.notifications || []);
    } catch (e: any) {
      setErr(e?.message || "Something went wrong loading your dashboard.");
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (!authChecking && userId) {
      reload();
    }
  }, [authChecking, userId]);

  const onRequestJoin = async (circleId: number) => {
    try {
      setBusyJoinId(circleId);
      setErr("");
      setMsg("");

      const token = localStorage.getItem("token");

      const res = await fetch("/api/circles/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ circle_id: circleId }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Join request failed");
      }

      const circle = allCircles.find((c) => c.id === circleId);
      if (circle) {
        setPendingMine((prev) => {
          const exists = prev.some((p) => p.circle_id === circleId);
          if (exists) return prev;

          return [
            {
              id: Date.now(),
              circle_id: circleId,
              user_auth_id: userId,
              role: "MEMBER",
              status: "PENDING",
              requested_at: new Date().toISOString(),
              circle_name: circle.name,
            } as RequestRow,
            ...prev,
          ];
        });
      }

      setMsg(data?.message || "Join request submitted.");
      await reload(false);
    } catch (e: any) {
      setErr(e?.message || "Join request failed.");
    } finally {
      setBusyJoinId(null);
    }
  };

  const onDecide = async (
    circleId: number,
    memberUserId: string,
    action: "APPROVE" | "REJECT",
    requestId: number
  ) => {
    try {
      setBusyDecisionId(requestId);
      setErr("");
      setMsg("");

      const result = await decideMember(circleId, memberUserId, action);
      setMsg(
        result.message ||
          (action === "APPROVE" ? "Member approved." : "Member rejected.")
      );
      await reload(false);
    } catch (e: any) {
      setErr(e?.message || "Decision failed.");
    } finally {
      setBusyDecisionId(null);
    }
  };

  const onMarkRead = async (id: number) => {
    try {
      setBusyNotificationId(id);
      await markNotificationRead(id);
      await reload(false);
    } catch (e: any) {
      setErr(e?.message || "Failed to mark notification as read.");
    } finally {
      setBusyNotificationId(null);
    }
  };

  const onSignOut = async () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.replace("/auth/login");
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const visibleAllCircles = allCircles.map((circle) => {
    const mineApproved = myCircles.find((m) => m.id === circle.id);
    const minePending = pendingMine.find((p) => p.circle_id === circle.id);

    let myStatus: "APPROVED" | "PENDING" | "NONE" = "NONE";
    if (mineApproved) myStatus = "APPROVED";
    else if (minePending) myStatus = "PENDING";

    return {
      ...circle,
      my_status: myStatus,
    };
  });

  if (authChecking) {
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
          <p
            className="mt-4 text-sm"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            Loading your dashboard…
          </p>
        </div>
      </div>
    );
  }

  const glassBtnBase: React.CSSProperties = {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.15)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    color: "rgba(255,255,255,0.8)",
    transition: "all 0.2s ease",
  };

  const emeraldBtn: React.CSSProperties = {
    background: "rgba(16,185,129,0.85)",
    border: "1px solid rgba(16,185,129,0.4)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    color: "#fff",
    transition: "all 0.2s ease",
  };

  const roseBtn: React.CSSProperties = {
    background: "rgba(225,29,72,0.85)",
    border: "1px solid rgba(225,29,72,0.4)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    color: "#fff",
    transition: "all 0.2s ease",
  };

  return (
    <main
      className="min-h-screen text-white"
      style={{
        background:
          "linear-gradient(135deg, #0f172a 0%, #134e4a 50%, #0f172a 100%)",
      }}
    >
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute rounded-full"
          style={{
            width: 600,
            height: 600,
            top: -200,
            left: -150,
            background:
              "radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)",
            animation: "float 8s ease-in-out infinite",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 500,
            height: 500,
            bottom: -100,
            right: -100,
            background:
              "radial-gradient(circle, rgba(59,130,246,0.10) 0%, transparent 70%)",
            animation: "float 10s ease-in-out infinite reverse",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 300,
            height: 300,
            top: "40%",
            left: "60%",
            background:
              "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)",
            animation: "float 12s ease-in-out infinite 2s",
          }}
        />
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-30px) scale(1.05); }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .animate-fadeIn { animation: fadeSlideIn 0.4s ease forwards; }
        .glass-card-hover {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .glass-card-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.12);
        }
      `}</style>

      <nav
        className="sticky top-0 z-30"
        style={{
          background: "rgba(15,23,42,0.7)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div
              className="grid h-8 w-8 place-items-center rounded-xl text-sm font-black text-white"
              style={{
                background: "linear-gradient(135deg, #10b981, #059669)",
                boxShadow: "0 0 16px rgba(16,185,129,0.4)",
              }}
            >
              C
            </div>
            <span className="font-bold text-white">CircleSave</span>
          </Link>

          <div className="flex items-center gap-3">
            {unreadCount > 0 ? (
              <button
                onClick={() => setOpenNotif(true)}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl"
                style={glassBtnBase}
              >
                🔔
                <span
                  className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
                  style={{
                    background: "#f43f5e",
                    boxShadow: "0 0 8px rgba(244,63,94,0.6)",
                  }}
                >
                  {unreadCount}
                </span>
              </button>
            ) : null}

            <div
              className="hidden items-center gap-2 rounded-xl px-3 py-1.5 sm:flex"
              style={glassBtnBase}
            >
              <div
                className="flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold text-white"
                style={{
                  background: "linear-gradient(135deg, #10b981, #059669)",
                }}
              >
                {(userName || userEmail || "U").charAt(0).toUpperCase()}
              </div>
              <span
                className="max-w-[140px] truncate text-xs font-semibold"
                style={{ color: "rgba(255,255,255,0.8)" }}
              >
                {userName || userEmail}
              </span>
            </div>

            <Link
              href="/dashboard/circles/new"
              className="rounded-xl px-3 py-2 text-xs font-bold text-white shadow-sm"
              style={emeraldBtn}
            >
              Create New Circle
            </Link>

            <button
              onClick={onSignOut}
              className="rounded-xl px-3 py-2 text-xs font-semibold"
              style={glassBtnBase}
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <div className="relative mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 animate-fadeIn">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Dashboard
            </h1>
            <p
              className="mt-1 text-sm"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              Welcome back
              {userName ? (
                <span
                  className="font-semibold"
                  style={{ color: "rgba(255,255,255,0.85)" }}
                >
                  {" "}
                  {userName}
                </span>
              ) : null}{" "}
              · Manage your savings circles
            </p>
          </div>

          <button
            onClick={() => reload()}
            disabled={dataLoading}
            className="flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-semibold disabled:opacity-50"
            style={glassBtnBase}
          >
            {dataLoading ? "Loading…" : "↻ Refresh"}
          </button>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: "My Groups",
              value: myCircles.length,
              color: "#10b981",
              glow: "rgba(16,185,129,0.3)",
            },
            {
              label: "Requested",
              value: pendingMine.length,
              color: "#3b82f6",
              glow: "rgba(59,130,246,0.3)",
            },
            {
              label: "Admin Requests",
              value: requests.length,
              color: "#f59e0b",
              glow: "rgba(245,158,11,0.3)",
            },
            {
              label: "Unread Notifs",
              value: unreadCount,
              color: "#f43f5e",
              glow: "rgba(244,63,94,0.3)",
            },
          ].map(({ label, value, color, glow }, i) => (
            <div
              key={label}
              className="rounded-2xl p-4 glass-card-hover animate-fadeIn"
              style={{
                background: "rgba(255,255,255,0.06)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                border: "1px solid rgba(255,255,255,0.10)",
                boxShadow:
                  "0 4px 20px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.04)",
                animationDelay: `${i * 60}ms`,
              }}
            >
              <p
                className="text-xs font-medium"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                {label}
              </p>
              <p
                className="mt-1 text-2xl font-extrabold"
                style={{ color, textShadow: `0 0 20px ${glow}` }}
              >
                {value}
              </p>
            </div>
          ))}
        </div>

        {dataLoading ? (
          <div
            className="mb-4 overflow-hidden rounded-full"
            style={{ background: "rgba(255,255,255,0.08)", height: 3 }}
          >
            <div
              className="h-full rounded-full animate-pulse"
              style={{
                width: "60%",
                background:
                  "linear-gradient(90deg, #10b981, #3b82f6, #10b981)",
                backgroundSize: "200% auto",
                animation: "shimmer 1.5s linear infinite",
              }}
            />
          </div>
        ) : null}

        {err ? (
          <div
            className="mb-4 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm animate-fadeIn"
            style={{
              background: "rgba(244,63,94,0.12)",
              border: "1px solid rgba(244,63,94,0.3)",
              backdropFilter: "blur(12px)",
              color: "#fda4af",
            }}
          >
            ⚠ {err}
          </div>
        ) : null}

        {msg ? (
          <div
            className="mb-4 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm animate-fadeIn"
            style={{
              background: "rgba(16,185,129,0.12)",
              border: "1px solid rgba(16,185,129,0.3)",
              backdropFilter: "blur(12px)",
              color: "#6ee7b7",
            }}
          >
            ✓ {msg}
          </div>
        ) : null}

        <div className="grid gap-4">
          <Section
            title="My Groups"
            subtitle="Circles you are an approved member of"
            count={myCircles.length}
            open={openMy}
            onToggle={() => setOpenMy((v) => !v)}
          >
            {myCircles.length === 0 ? (
              <p
                className="text-sm"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                No approved circles yet. Request to join one below.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {myCircles.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-start justify-between gap-3 rounded-2xl p-4 glass-card-hover"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.10)",
                    }}
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{c.name}</p>
                      <p
                        className="mt-0.5 text-xs"
                        style={{ color: "rgba(255,255,255,0.45)" }}
                      >
                        ${c.contribution_amount}/month · Circle #{c.id}
                      </p>
                      <div className="mt-1">
                        <Badge color="emerald">Approved</Badge>
                      </div>
                    </div>

                    <Link
                      href={`/dashboard/circles/${c.id}`}
                      className="shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold text-white"
                      style={emeraldBtn}
                    >
                      Open →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section
            title="Requested Groups"
            subtitle="Your join requests awaiting approval"
            count={pendingMine.length}
            open={openReq}
            onToggle={() => setOpenReq((v) => !v)}
          >
            {pendingMine.length === 0 ? (
              <p
                className="text-sm"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                No pending requests.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {pendingMine.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-2xl p-4 glass-card-hover"
                    style={{
                      background: "rgba(59,130,246,0.08)",
                      border: "1px solid rgba(59,130,246,0.2)",
                    }}
                  >
                    <p className="text-sm font-semibold text-white">
                      {c.circle_name || `Circle #${c.circle_id}`}
                    </p>
                    <p
                      className="mt-1 text-xs"
                      style={{ color: "rgba(255,255,255,0.45)" }}
                    >
                      Requested at{" "}
                      {c.requested_at
                        ? new Date(c.requested_at).toLocaleString()
                        : "—"}
                    </p>
                    <div className="mt-2">
                      <Badge color="blue">Requested</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section
            title="Notifications"
            subtitle="Approvals, requests, and account events"
            count={unreadCount}
            open={openNotif}
            onToggle={() => setOpenNotif((v) => !v)}
          >
            {notifications.length === 0 ? (
              <p
                className="text-sm"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                No notifications yet.
              </p>
            ) : (
              <div className="space-y-3">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="rounded-2xl p-4 glass-card-hover"
                    style={
                      n.read
                        ? {
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.08)",
                          }
                        : {
                            background: "rgba(16,185,129,0.08)",
                            border: "1px solid rgba(16,185,129,0.25)",
                          }
                    }
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white">
                          {n.title}
                        </p>
                        <p
                          className="mt-1 text-sm"
                          style={{ color: "rgba(255,255,255,0.6)" }}
                        >
                          {n.message}
                        </p>
                        <p
                          className="mt-2 text-xs"
                          style={{ color: "rgba(255,255,255,0.35)" }}
                        >
                          {new Date(n.created_at).toLocaleString()}
                        </p>
                      </div>

                      {!n.read ? (
                        <button
                          onClick={() => onMarkRead(n.id)}
                          disabled={busyNotificationId === n.id}
                          className="shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                          style={glassBtnBase}
                        >
                          {busyNotificationId === n.id ? "..." : "Mark read"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section
            title="Admin Requests"
            subtitle="Approve or reject join requests for circles you own"
            count={requests.length}
            open={openAdmin}
            onToggle={() => setOpenAdmin((v) => !v)}
          >
            {requests.length === 0 ? (
              <p
                className="text-sm"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                No pending requests for your circles.
              </p>
            ) : (
              <div className="space-y-3">
                {requests.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-2xl p-4 glass-card-hover"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.10)",
                    }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {r.circle_name || `Circle #${r.circle_id}`}
                        </p>
                        <p
                          className="mt-0.5 text-sm"
                          style={{ color: "rgba(255,255,255,0.6)" }}
                        >
                          Requested by{" "}
                          <span className="font-medium text-white">
                            {r.requester?.full_name ||
                              r.requester?.email ||
                              r.user_auth_id}
                          </span>
                        </p>
                        <p
                          className="mt-1 text-xs"
                          style={{ color: "rgba(255,255,255,0.35)" }}
                        >
                          {r.requested_at
                            ? new Date(r.requested_at).toLocaleString()
                            : "—"}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            onDecide(r.circle_id, r.user_auth_id, "APPROVE", r.id)
                          }
                          disabled={busyDecisionId === r.id}
                          className="rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-50"
                          style={emeraldBtn}
                        >
                          {busyDecisionId === r.id ? "..." : "Accept"}
                        </button>

                        <button
                          onClick={() =>
                            onDecide(r.circle_id, r.user_auth_id, "REJECT", r.id)
                          }
                          disabled={busyDecisionId === r.id}
                          className="rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-50"
                          style={roseBtn}
                        >
                          {busyDecisionId === r.id ? "..." : "Reject"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section
            title="All Circles"
            subtitle="Browse available circles and request to join"
            count={allCircles.length}
            open={openAll}
            onToggle={() => setOpenAll((v) => !v)}
          >
            {visibleAllCircles.length === 0 ? (
              <p
                className="text-sm"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                {dataLoading ? "Loading circles…" : "No circles found."}
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {visibleAllCircles.map((c: any) => {
                  const st = c.my_status as "APPROVED" | "PENDING" | "NONE";
                  const disabled = st === "PENDING" || st === "APPROVED";

                  return (
                    <div
                      key={c.id}
                      className="rounded-2xl p-4 glass-card-hover"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.10)",
                      }}
                    >
                      <p className="text-sm font-semibold text-white">{c.name}</p>
                      <p
                        className="mt-0.5 text-xs"
                        style={{ color: "rgba(255,255,255,0.45)" }}
                      >
                        ${c.contribution_amount}/month · Circle #{c.id}
                      </p>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        {st === "APPROVED" ? (
                          <Badge color="emerald">Member</Badge>
                        ) : st === "PENDING" ? (
                          <Badge color="blue">Requested</Badge>
                        ) : (
                          <Badge color="slate">Not a member</Badge>
                        )}

                        <button
                          disabled={busyJoinId === c.id || disabled}
                          onClick={() => onRequestJoin(c.id)}
                          className="rounded-xl px-4 py-2 text-xs font-bold transition disabled:opacity-50"
                          style={
                            disabled
                              ? {
                                  background: "rgba(255,255,255,0.05)",
                                  border: "1px solid rgba(255,255,255,0.08)",
                                  color: "rgba(255,255,255,0.3)",
                                  cursor: "not-allowed",
                                }
                              : emeraldBtn
                          }
                        >
                          {busyJoinId === c.id
                            ? "Requesting..."
                            : st === "PENDING"
                            ? "Requested"
                            : st === "APPROVED"
                            ? "Joined"
                            : "Request to Join"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>
        </div>

        <footer
          className="py-10 text-center text-xs"
          style={{ color: "rgba(255,255,255,0.25)" }}
        >
          © {new Date().getFullYear()} CircleSave · Secure savings circle platform
        </footer>
      </div>

      <ChatbotWidget
        myCircles={myCircles}
        allCircles={allCircles}
        requests={requests}
        notifications={notifications}
        userName={userName}
      />
      <SmallChatbot />
    </main>
    
  );
}