import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

export function getBearerToken(req: NextRequest) {
  const h = req.headers.get("authorization") || "";
  const [type, token] = h.split(" ");
  if (type !== "Bearer" || !token) return null;
  return token.trim();
}

export function requireUserId(req: NextRequest): number {
  const token = getBearerToken(req);
  if (!token) throw new Error("Missing token");

  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    const userId = payload?.userId;
    if (!userId) throw new Error("Invalid token");
    return userId;
  } catch {
    throw new Error("Invalid token");
  }
}

export function monthKeyNow() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
