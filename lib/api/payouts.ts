export type Contribution = {
  id: number;
  circle_id: number;
  user_auth_id: string;
  cycle_no: number;
  amount: number;
  status: string;
  paid_at: string;
  created_at: string;
};

async function handleJson<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || "Request failed");
  }
  return data;
}

export async function addContribution(payload: {
  circle_id: number;
  cycle_no: number;
  amount: number;
}): Promise<{ success: boolean; contribution: Contribution }> {
  const res = await fetch("/api/contributions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleJson(res);
}

export async function fetchContributions(circleId: number): Promise<{
  contributions: Contribution[];
}> {
  const res = await fetch(`/api/contributions/${circleId}`, {
    method: "GET",
    cache: "no-store",
  });
  return handleJson(res);
}