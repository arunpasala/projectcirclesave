import jwt, { JwtPayload } from "jsonwebtoken";
import { NextRequest } from "next/server";

export function getUserIdFromToken(token: string): number {
  const secret = process.env.JWT_SECRET || "dev_secret";
  const decoded = jwt.verify(token, secret) as JwtPayload | string;

  if (typeof decoded === "string") throw new Error("Invalid token payload");
  const id = decoded.userId;

  const n = Number(id);
  if (!Number.isFinite(n) || n <= 0) throw new Error("Invalid userId in token");
  return n;
}

export function requireUserId(reqOrHeaders: NextRequest | Headers | any): number {
  const headers: Headers =
    reqOrHeaders?.headers instanceof Headers ? reqOrHeaders.headers : reqOrHeaders;

  const auth = headers?.get?.("authorization") || "";
  if (!auth.startsWith("Bearer ")) throw new Error("Missing Bearer token");

  const token = auth.slice("Bearer ".length).trim();
  if (!token) throw new Error("Missing token");

  return getUserIdFromToken(token);
}