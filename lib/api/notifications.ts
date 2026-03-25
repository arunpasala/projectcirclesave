export type NotificationItem = {
  id: number;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  type?: string | null;
  meta?: Record<string, unknown> | null;
};

async function handleJson<T>(res: Response): Promise<T> {
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
  });
  return handleJson(res);
}

export async function markNotificationRead(
  id: number
): Promise<{ success: boolean }> {
  const res = await fetch("/api/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  return handleJson(res);
}