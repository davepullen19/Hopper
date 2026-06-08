"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { productSchema } from "@/lib/validations";
import { type ActionResult, toErrorMessage } from "@/lib/action-result";

function revalidateProducts() {
  revalidatePath("/products");
  revalidatePath("/");
}

export async function createProduct(input: unknown): Promise<ActionResult> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  try {
    await prisma.product.create({ data: parsed.data });
    revalidateProducts();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toErrorMessage(e, "SKU must be unique") };
  }
}

export async function updateProduct(
  id: string,
  input: unknown
): Promise<ActionResult> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  try {
    await prisma.product.update({ where: { id }, data: parsed.data });
    revalidateProducts();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toErrorMessage(e, "SKU must be unique") };
  }
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  try {
    await prisma.product.delete({ where: { id } });
    revalidateProducts();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toErrorMessage(e) };
  }
}
