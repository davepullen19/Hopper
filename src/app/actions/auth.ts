"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { signInSchema } from "@/lib/validations";
import { type ActionResult } from "@/lib/action-result";
import {
  verifyPassword,
  setSessionCookie,
  clearSessionCookie,
} from "@/lib/auth";

export async function signIn(input: unknown): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  // Same generic error whether the email is unknown or the password is wrong.
  if (!user || !user.passwordHash) {
    return { ok: false, error: "Invalid email or password" };
  }
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return { ok: false, error: "Invalid email or password" };
  }

  await setSessionCookie(user.id);
  return { ok: true };
}

export async function signOut() {
  await clearSessionCookie();
  redirect("/sign-in");
}
