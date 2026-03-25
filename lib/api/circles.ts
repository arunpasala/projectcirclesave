export type Circle = {
  id: number;
  name: string;
  contribution_amount: number;
  created_at: string;
  owner_auth_id: string;
  membership_role?: string | null;
  membership_status?: string | null;
  joined_at?: string | null;
};

export type CircleMember = {
  id: number;
  circle_id: number;
  user_auth_id: string;
  role: string;
  status: string;
  requested_at: string | null;
  joined_at: string | null;
  decided_at: string | null;
  profile?: {
    id: string;
    email: string | null;
    full_name: string | null;
  } | null;
};

export type CircleRequest = {
  id: number;
  circle_id: number;
  user_auth_id: string;
  role: string;
  status: string;
  requested_at: string | null;
  joined_at: string | null;
  decided_at: string | null;
  circle_name?: string | null;
  requester?: {
    id: string;
    email: string | null;
    full_name: string | null;
  } | null;
};

async function handleJson<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || "Request failed");
  }
  return data;
}

export async function fetchAllCircles(): Promise<{ circles: Circle[] }> {
  const res = await fetch("/api/circles/all", {
    method: "GET",
    cache: "no-store",
  });
  return handleJson(res);
}

export async function fetchMyCircles(): Promise<{ circles: Circle[] }> {
  const res = await fetch("/api/circles/my", {
    method: "GET",
    cache: "no-store",
  });
  return handleJson(res);
}

export async function fetchCircleRequests(): Promise<{
  requests: CircleRequest[];
  pendingMine: CircleRequest[];
}> {
  const res = await fetch("/api/circles/requests", {
    method: "GET",
    cache: "no-store",
  });
  return handleJson(res);
}

export async function fetchCircleById(id: number): Promise<{ circle: Circle }> {
  const res = await fetch(`/api/circles/${id}`, {
    method: "GET",
    cache: "no-store",
  });
  return handleJson(res);
}

export async function fetchCircleMembers(
  id: number
): Promise<{ members: CircleMember[] }> {
  const res = await fetch(`/api/circles/${id}/members`, {
    method: "GET",
    cache: "no-store",
  });
  return handleJson(res);
}

export async function createCircle(payload: {
  name: string;
  contribution_amount: number;
}): Promise<{ circle: Circle }> {
  const res = await fetch("/api/circles/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleJson(res);
}

export async function joinCircle(circle_id: number): Promise<{
  success: boolean;
  message: string;
  status?: string;
}> {
  const res = await fetch("/api/circles/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ circle_id }),
  });
  return handleJson(res);
}

export async function decideMember(
  circleId: number,
  memberUserId: string,
  action: "APPROVE" | "REJECT"
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`/api/circles/${circleId}/decide`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ memberUserId, action }),
  });
  return handleJson(res);
}

export async function deleteCircle(
  circleId: number
): Promise<{ success: boolean }> {
  const res = await fetch(`/api/circles/${circleId}`, {
    method: "DELETE",
  });
  return handleJson(res);
}