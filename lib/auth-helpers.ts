import jwt, { JwtPayload } from "jsonwebtoken";

export type AppJwtPayload = JwtPayload & {
  userId: number | string;
  authUserId?: string;
  email?: string;
  role?: string;
};

export function requireAuth(req: Request): AppJwtPayload {
  const auth = req.headers.get("authorization");

  if (!auth || !auth.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  const token = auth.split(" ")[1];

  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET missing");
  }

  return jwt.verify(token, process.env.JWT_SECRET) as AppJwtPayload;
}

export function requireUserId(req: Request): string {
  const decoded = requireAuth(req);
  return String(decoded.userId);
}

export function requireAuthUserId(req: Request): string {
  const decoded = requireAuth(req);

  if (!decoded.authUserId) {
    throw new Error("authUserId missing in token");
  }

  return decoded.authUserId;
}