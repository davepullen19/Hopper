// Edge-safe session helpers (jose only — no Node/Prisma imports).
// Safe to import from middleware.
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "hopper_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(userId: string) {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(
  token: string
): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload.sub ? { userId: payload.sub } : null;
  } catch {
    return null;
  }
}
