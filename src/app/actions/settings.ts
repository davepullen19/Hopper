"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { companySchema, userSchema } from "@/lib/validations";
import { type ActionResult, toErrorMessage } from "@/lib/action-result";

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
  try {
    await prisma.user.delete({ where: { id } });
    revalidateSettings();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toErrorMessage(e) };
  }
}
