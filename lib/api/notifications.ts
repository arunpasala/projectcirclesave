export type NotificationItem = {
  id: number;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  type?: string | null;
  meta?: Record<string, unknown> | null;
};

function getAuthHeaders(extra?: HeadersInit): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  return {
    ...(extra || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleJson<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    const text = await res.text();
    throw new Error(text || "Server returned a non-JSON response");
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error || "Request failed");
  }

  return data;
}

export async function fetchNotifications(): Promise<{
  notifications: NotificationItem[];
}> {
  const res = await fetch("/api/notifications", {
    method: "GET",
    cache: "no-store",
    headers: getAuthHeaders(),
  });

  return handleJson(res);
}

export async function markNotificationRead(
  id: number
): Promise<{ success: boolean }> {
  const res = await fetch("/api/notifications", {
    method: "POST",
    headers: getAuthHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({ id }),
  });

  return handleJson(res);
}