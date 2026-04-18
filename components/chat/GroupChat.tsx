"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ChatMessage = {
  id: number;
  circle_id: number;
  sender_auth_id: string;
  sender_label: string;
  message: string;
  created_at: string;
  seen_by: string[];
  delivered: boolean;
};

type Props = {
  circleId: number;
  onClose?: () => void;
};

function parseJwt(token: string) {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((char) => `%${("00" + char.charCodeAt(0).toString(16)).slice(-2)}`)
        .join("")
    );

    return JSON.parse(json);
  } catch {
    return null;
  }
}

function formatTime(value: string) {
  const date = new Date(value);
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function sameDay(a: string, b: string) {
  const x = new Date(a);
  const y = new Date(b);

  return (
    x.getFullYear() === y.getFullYear() &&
    x.getMonth() === y.getMonth() &&
    x.getDate() === y.getDate()
  );
}

function formatDayLabel(value: string) {
  const date = new Date(value);
  return date.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function TickMarks({ isSeen }: { isSeen: boolean }) {
  return (
    <span
      className={`ml-1 inline-flex items-center text-[11px] font-semibold ${
        isSeen ? "text-sky-300" : "text-white/70"
      }`}
    >
      ✓✓
    </span>
  );
}

export default function GroupChat({ circleId, onClose }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [authUserId, setAuthUserId] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token") || "";
    const payload = parseJwt(token);

    if (payload?.authUserId) setAuthUserId(payload.authUserId);
    else if (payload?.userId) setAuthUserId(payload.userId);
  }, []);

  const scrollToBottom = (smooth = true) => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "end",
      });
    });
  };

  const fetchMessages = async (smooth = false) => {
    try {
      setError("");

      const token = localStorage.getItem("token") || "";

      const res = await fetch(`/api/circles/${circleId}/groupchat`, {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to load messages");
      }

      setMessages(data.messages || []);
      scrollToBottom(smooth);
    } catch (err: any) {
      setError(err?.message || "Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    try {
      setSending(true);
      setError("");

      const token = localStorage.getItem("token") || "";

      const res = await fetch(`/api/circles/${circleId}/groupchat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to send message");
      }

      setInput("");
      await fetchMessages(true);
    } catch (err: any) {
      setError(err?.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    fetchMessages(false);
  }, [circleId]);

  useEffect(() => {
    const channel = supabase
      .channel(`groupchat-circle-${circleId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "circle_messages",
          filter: `circle_id=eq.${circleId}`,
        },
        () => fetchMessages(true)
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "circle_messages",
          filter: `circle_id=eq.${circleId}`,
        },
        () => fetchMessages(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [circleId, supabase]);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="mx-auto flex h-[560px] w-[380px] flex-col rounded-3xl border border-white/10 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Circle Group Chat</h3>
            <p className="text-xs text-white/50">
              Live chat for approved members of this circle
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-full px-3 py-1 text-xs font-semibold text-white/80 hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        <div
          className="mb-4 flex-1 overflow-y-auto rounded-2xl border border-white/10 bg-black/10 p-4"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        >
          {loading ? (
            <p className="text-sm text-white/50">Loading messages...</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-white/50">
              No messages yet. Start the conversation.
            </p>
          ) : (
            <div className="space-y-3">
              {messages.map((msg, index) => {
                const previous = messages[index - 1];
                const isMine = authUserId === msg.sender_auth_id;
                const showDayDivider =
                  !previous || !sameDay(previous.created_at, msg.created_at);

                const isSeenByOthers =
                  isMine &&
                  (msg.seen_by ?? []).some((id) => id !== authUserId);

                return (
                  <div key={msg.id}>
                    {showDayDivider && (
                      <div className="mb-3 flex justify-center">
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/60">
                          {formatDayLabel(msg.created_at)}
                        </span>
                      </div>
                    )}

                    <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                          isMine ? "bg-blue-600 text-white" : "bg-white/10 text-white"
                        }`}
                      >
                        {!isMine && (
                          <div className="mb-1 text-xs font-semibold text-emerald-300">
                            {msg.sender_label}
                          </div>
                        )}

                        <p className="break-words whitespace-pre-wrap">{msg.message}</p>

                        <div
                          className={`mt-1 flex items-center text-[11px] ${
                            isMine
                              ? "justify-end text-blue-100/90"
                              : "justify-end text-white/60"
                          }`}
                        >
                          <span>{formatTime(msg.created_at)}</span>
                          {isMine && <TickMarks isSeen={isSeenByOthers} />}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {error ? (
          <div className="mb-2 text-xs text-rose-300">{error}</div>
        ) : null}

        <div className="flex gap-2">
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Type a message..."
            className="max-h-28 min-h-[48px] flex-1 resize-none rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-gray-300"
            disabled={sending}
          />

          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="rounded-2xl bg-blue-600 px-5 py-3 text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? "..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}