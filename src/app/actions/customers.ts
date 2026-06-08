"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { customerSchema } from "@/lib/validations";
import { type ActionResult, toErrorMessage } from "@/lib/action-result";

function revalidateCustomers() {
  revalidatePath("/customers");
  revalidatePath("/orders");
}

export async function createCustomer(input: unknown): Promise<ActionResult> {
  const parsed = customerSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  try {
    await prisma.customer.create({ data: parsed.data });
    revalidateCustomers();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toErrorMessage(e) };
  }
}

export async function updateCustomer(
  id: string,
  input: unknown
): Promise<ActionResult> {
  const parsed = customerSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  try {
    await prisma.customer.update({ where: { id }, data: parsed.data });
    revalidateCustomers();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toErrorMessage(e) };
  }
}

export async function deleteCustomer(id: string): Promise<ActionResult> {
  try {
    await prisma.customer.delete({ where: { id } });
    revalidateCustomers();
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: toErrorMessage(e) + " (a customer with orders cannot be deleted)",
    };
  }
}
