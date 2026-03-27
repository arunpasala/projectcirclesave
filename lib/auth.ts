import jwt, { JwtPayload } from "jsonwebtoken";

export function requireUserId(req: Request): string {
  const auth = req.headers.get("authorization");

  if (!auth || !auth.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  const token = auth.split(" ")[1];

  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET missing");
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;

  return decoded.userId as string;
}