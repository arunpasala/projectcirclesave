import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

export function getUserIdFromAuthHeader(req: NextRequest): number | null {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev_secret") as any;
    const id = Number(payload?.userId);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

// ✅ add this so older routes stop breaking
export function requireUserId(req: NextRequest): number {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) throw new Error("Missing Bearer token");

  const id = getUserIdFromAuthHeader(req);
  if (!id) throw new Error("Invalid/expired token");
  return id;
}

