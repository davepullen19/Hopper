import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
  verifySessionToken,
} from "@/lib/session";

export { SESSION_COOKIE };

// ---- password hashing (Node runtime only) ----
export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}
export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

// ---- cookie helpers (server actions / route handlers) ----
export async function setSessionCookie(userId: string) {
  const token = await createSessionToken(userId);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Current signed-in user (server components / actions). Null if not signed in. */
export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session) return null;
  return prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      company: { select: { name: true } },
    },
  });
}

export type CurrentUser = Awaited<ReturnType<typeof getCurrentUser>>;

/** Roles allowed to manage other users (create/delete, set passwords). */
export const ADMIN_ROLES = ["OWNER", "ADMIN"] as const;

export function isAdminRole(role: string | undefined | null) {
  return role === "OWNER" || role === "ADMIN";
}

/** Returns the current user only if they're an OWNER/ADMIN, else null. */
export async function requireAdmin() {
  const user = await getCurrentUser();
  return isAdminRole(user?.role) ? user : null;
}
