import jwt from "jsonwebtoken";

export function requireUserId(authHeader: string | null): number | null {
  try {
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

    const token = authHeader.substring(7).trim();
    const secret = process.env.JWT_SECRET;
    if (!secret) return null;

    const decoded = jwt.verify(token, secret) as { userId: number };
    return decoded.userId;
  } catch {
    return null;
  }
}
