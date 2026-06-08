"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  inventoryItemSchema,
  inventoryItemUpdateSchema,
  stockMovementSchema,
} from "@/lib/validations";
import { type ActionResult, toErrorMessage } from "@/lib/action-result";
import { recordMovement } from "@/lib/inventory";

function revalidateInventory() {
  revalidatePath("/inventory");
  revalidatePath("/stock-movements");
  revalidatePath("/");
}

export async function createInventoryItem(
  input: unknown
): Promise<ActionResult> {
  const parsed = inventoryItemSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { openingQuantity, ...rest } = parsed.data;
  try {
    await prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.create({
        data: { ...rest, currentQuantity: 0 },
      });
      if (openingQuantity > 0) {
        await recordMovement(tx, {
          inventoryItemId: item.id,
          type: "ADJUSTMENT",
          quantity: openingQuantity,
          notes: "Opening balance",
        });
      }
    });
    revalidateInventory();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toErrorMessage(e) };
  }
}

export async function updateInventoryItem(
  id: string,
  input: unknown
): Promise<ActionResult> {
  const parsed = inventoryItemUpdateSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  try {
    await prisma.inventoryItem.update({ where: { id }, data: parsed.data });
    revalidateInventory();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toErrorMessage(e) };
  }
}

export async function deleteInventoryItem(id: string): Promise<ActionResult> {
  try {
    await prisma.inventoryItem.delete({ where: { id } });
    revalidateInventory();
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error:
        toErrorMessage(e) +
        " (items used in recipes cannot be deleted — remove them from recipes first)",
    };
  }
}

/** Manual stock movement — purchase, adjustment, return, etc. */
export async function createStockMovement(
  input: unknown
): Promise<ActionResult> {
  const parsed = stockMovementSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  try {
    await prisma.$transaction((tx) =>
      recordMovement(tx, {
        inventoryItemId: parsed.data.inventoryItemId,
        type: parsed.data.type,
        quantity: parsed.data.quantity,
        notes: parsed.data.notes,
      })
    );
    revalidateInventory();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toErrorMessage(e) };
  }
}
