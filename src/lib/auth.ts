import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { AdminRole } from "@/models/Admin";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-dev-secret-change-me";

export interface JWTPayload {
  adminId: string;
  email: string;
  role: AdminRole;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as Record<string, any>;
    if (!payload.role) {
      payload.role = "admin";
    }
    return payload as JWTPayload;
  } catch {
    return null;
  }
}
