"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  companySchema,
  userSchema,
  setPasswordSchema,
  changePasswordSchema,
} from "@/lib/validations";
import { type ActionResult, toErrorMessage } from "@/lib/action-result";
import {
  getCurrentUser,
  requireAdmin,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";

const NOT_AUTHORISED = "You don't have permission to do that.";

function revalidateSettings() {
  revalidatePath("/settings");
}

// ---------- Company ----------

export async function saveCompany(
  id: string | null,
  input: unknown
): Promise<ActionResult<string>> {
  const parsed = companySchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  try {
    const company = id
      ? await prisma.company.update({ where: { id }, data: parsed.data })
      : await prisma.company.create({ data: parsed.data });
    revalidateSettings();
    return { ok: true, data: company.id };
  } catch (e) {
    return { ok: false, error: toErrorMessage(e) };
  }
}

// ---------- Users ----------

export async function createUser(input: unknown): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: NOT_AUTHORISED };
  const parsed = userSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { companyId, ...rest } = parsed.data;
  try {
    await prisma.user.create({
      data: { ...rest, companyId: companyId || null },
    });
    revalidateSettings();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toErrorMessage(e, "A user with that email already exists") };
  }
}

export async function updateUser(
  id: string,
  input: unknown
): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: NOT_AUTHORISED };
  const parsed = userSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { companyId, ...rest } = parsed.data;
  try {
    await prisma.user.update({
      where: { id },
      data: { ...rest, companyId: companyId || null },
    });
    revalidateSettings();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toErrorMessage(e, "A user with that email already exists") };
  }
}

export async function deleteUser(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: NOT_AUTHORISED };
  if (admin.id === id)
    return { ok: false, error: "You can't remove your own account." };
  try {
    await prisma.user.delete({ where: { id } });
    revalidateSettings();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toErrorMessage(e) };
  }
}

// ---------- Passwords ----------

/** Admin sets/resets another user's password (lets them sign in). */
export async function setUserPassword(
  userId: string,
  input: unknown
): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: NOT_AUTHORISED };
  const parsed = setPasswordSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(parsed.data.password) },
    });
    revalidateSettings();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toErrorMessage(e) };
  }
}

/** A signed-in user changes their own password (verifies the current one). */
export async function changeOwnPassword(input: unknown): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, error: "You're not signed in." };
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const record = await prisma.user.findUnique({
    where: { id: me.id },
    select: { passwordHash: true },
  });
  if (
    !record?.passwordHash ||
    !(await verifyPassword(parsed.data.currentPassword, record.passwordHash))
  ) {
    return { ok: false, error: "Current password is incorrect." };
  }

  try {
    await prisma.user.update({
      where: { id: me.id },
      data: { passwordHash: await hashPassword(parsed.data.newPassword) },
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toErrorMessage(e) };
  }
}
