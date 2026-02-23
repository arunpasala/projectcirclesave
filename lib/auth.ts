import { NextRequest } from "next/server";
import jwt, { JwtPayload } from "jsonwebtoken";

/**
 * Extract userId from a JWT token string.
 * Token payload must include { userId: number }
 */
export function getUserIdFromToken(token: string): number {
  const secret = process.env.JWT_SECRET || "dev_secret";
  const decoded = jwt.verify(token, secret) as JwtPayload | string;

  if (typeof decoded === "string") {
    throw new Error("Invalid token payload");
  }

  const userId = (decoded as any).userId;
  const idNum = Number(userId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    throw new Error("Invalid userId in token");
  }
  return idNum;
}

/**
 * Accepts NextRequest OR Headers (so you can call requireUserId(req) or requireUserId(req.headers))
 */
export function requireUserId(reqOrHeaders: NextRequest | Headers): number {
  const headers = reqOrHeaders instanceof Headers ? reqOrHeaders : reqOrHeaders.headers;

  const auth = headers.get("authorization") || headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) throw new Error("Missing Bearer token");

  const token = auth.slice("Bearer ".length).trim();
  if (!token) throw new Error("Missing token");

  return getUserIdFromToken(token);
}