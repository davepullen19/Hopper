"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  batchSchema,
  batchStatusUpdateSchema,
  batchYieldSchema,
  batchPackageSchema,
  batchNoteSchema,
} from "@/lib/validations";
import { type ActionResult, toErrorMessage } from "@/lib/action-result";
import { recordMovement } from "@/lib/inventory";

function revalidateBatches(id?: string) {
  revalidatePath("/batches");
  if (id) revalidatePath(`/batches/${id}`);
  revalidatePath("/inventory");
  revalidatePath("/stock-movements");
  revalidatePath("/");
}

// ---------- CRUD ----------

export async function createBatch(input: unknown): Promise<ActionResult<string>> {
  const parsed = batchSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { recipeId, productId, brewDate, ...rest } = parsed.data;
  try {
    const batch = await prisma.batch.create({
      data: {
        ...rest,
        recipeId: recipeId || null,
        productId: productId || null,
        brewDate: brewDate ? new Date(brewDate) : null,
        status: "PLANNED",
        events: {
          create: { type: "CREATED", notes: "Batch created" },
        },
      },
    });
    revalidateBatches(batch.id);
    return { ok: true, data: batch.id };
  } catch (e) {
    return { ok: false, error: toErrorMessage(e, "Batch code must be unique") };
  }
}

export async function updateBatch(
  id: string,
  input: unknown
): Promise<ActionResult> {
  const parsed = batchSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { recipeId, productId, brewDate, ...rest } = parsed.data;
  try {
    await prisma.batch.update({
      where: { id },
      data: {
        ...rest,
        recipeId: recipeId || null,
        productId: productId || null,
        brewDate: brewDate ? new Date(brewDate) : null,
      },
    });
    revalidateBatches(id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toErrorMessage(e, "Batch code must be unique") };
  }
}

export async function deleteBatch(id: string): Promise<ActionResult> {
  try {
    await prisma.batch.delete({ where: { id } });
    revalidateBatches();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toErrorMessage(e) };
  }
}

// ---------- Batch actions (each writes a BatchEvent) ----------

/** Move PLANNED -> BREWED, stamp brew date. */
export async function startBatch(batchId: string): Promise<ActionResult> {
  try {
    await prisma.$transaction(async (tx) => {
      const batch = await tx.batch.findUniqueOrThrow({ where: { id: batchId } });
      await tx.batch.update({
        where: { id: batchId },
        data: {
          status: "BREWED",
          brewDate: batch.brewDate ?? new Date(),
        },
      });
      await tx.batchEvent.create({
        data: {
          batchId,
          type: "BREWED",
          notes: "Batch started / brewed",
          metadata: { from: batch.status, to: "BREWED" } as Prisma.InputJsonValue,
        },
      });
    });
    revalidateBatches(batchId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toErrorMessage(e) };
  }
}

/**
 * Consume the linked recipe's ingredients from raw/packaging inventory,
 * scaled by plannedVolume / recipe.targetBatchVolume. Creates one CONSUME
 * stock movement per ingredient plus a single INGREDIENT_CONSUMED batch event.
 */
export async function consumeIngredients(batchId: string): Promise<ActionResult> {
  try {
    await prisma.$transaction(async (tx) => {
      const batch = await tx.batch.findUniqueOrThrow({
        where: { id: batchId },
        include: { recipe: { include: { ingredients: true } } },
      });
      if (!batch.recipe)
        throw new Error("Batch has no linked recipe to consume from.");
      const ingredients = batch.recipe.ingredients;
      if (ingredients.length === 0)
        throw new Error("Recipe has no ingredients.");

      const scale =
        batch.recipe.targetBatchVolume > 0
          ? batch.plannedVolume / batch.recipe.targetBatchVolume
          : 1;

      const consumed: { itemId: string; quantity: number }[] = [];
      for (const ing of ingredients) {
        const qty = ing.quantity * scale;
        await recordMovement(tx, {
          inventoryItemId: ing.inventoryItemId,
          type: "CONSUME",
          quantity: qty,
          notes: `Consumed for batch ${batch.code}`,
          batchId,
        });
        consumed.push({ itemId: ing.inventoryItemId, quantity: qty });
      }

      await tx.batchEvent.create({
        data: {
          batchId,
          type: "INGREDIENT_CONSUMED",
          notes: `Consumed ${ingredients.length} ingredient(s) at ${scale.toFixed(
            2
          )}× recipe scale`,
          metadata: { scale, consumed } as Prisma.InputJsonValue,
        },
      });
    });
    revalidateBatches(batchId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toErrorMessage(e) };
  }
}

export async function changeBatchStatus(input: unknown): Promise<ActionResult> {
  const parsed = batchStatusUpdateSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { batchId, status, notes } = parsed.data;
  try {
    await prisma.$transaction(async (tx) => {
      const batch = await tx.batch.findUniqueOrThrow({ where: { id: batchId } });
      await tx.batch.update({ where: { id: batchId }, data: { status } });
      await tx.batchEvent.create({
        data: {
          batchId,
          type: status === "DUMPED" ? "DUMPED" : "STATUS_CHANGED",
          notes: notes ?? `Status: ${batch.status} → ${status}`,
          metadata: { from: batch.status, to: status } as Prisma.InputJsonValue,
        },
      });
    });
    revalidateBatches(batchId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toErrorMessage(e) };
  }
}

export async function recordYield(input: unknown): Promise<ActionResult> {
  const parsed = batchYieldSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { batchId, actualVolume } = parsed.data;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.batch.update({
        where: { id: batchId },
        data: { actualVolume },
      });
      await tx.batchEvent.create({
        data: {
          batchId,
          type: "NOTE_ADDED",
          notes: `Recorded actual yield: ${actualVolume} L`,
          metadata: { actualVolume } as Prisma.InputJsonValue,
        },
      });
    });
    revalidateBatches(batchId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toErrorMessage(e) };
  }
}

/**
 * Package a batch into finished goods. Produces finished-goods stock (PRODUCE)
 * for the chosen product and optionally consumes packaging materials (PACKAGE).
 * Sets status PACKAGED + stamps package date.
 */
export async function packageBatch(input: unknown): Promise<ActionResult> {
  const parsed = batchPackageSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { batchId, productId, units, packagingItemId, packagingPerUnit, notes } =
    parsed.data;
  try {
    await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUniqueOrThrow({
        where: { id: productId },
        include: { inventoryItem: true },
      });

      // Ensure a finished-goods inventory record exists for the product.
      let fgItemId = product.inventoryItem?.id;
      if (!fgItemId) {
        const created = await tx.inventoryItem.create({
          data: {
            name: `${product.name} (${product.unitSize})`,
            type: "FINISHED_GOODS",
            category: product.style,
            unitOfMeasure: "units",
            currentQuantity: 0,
            reorderThreshold: 0,
            productId: product.id,
          },
        });
        fgItemId = created.id;
      }

      await recordMovement(tx, {
        inventoryItemId: fgItemId,
        type: "PRODUCE",
        quantity: units,
        notes: `Packaged from batch`,
        batchId,
      });

      if (packagingItemId) {
        await recordMovement(tx, {
          inventoryItemId: packagingItemId,
          type: "PACKAGE",
          quantity: units * (packagingPerUnit || 1),
          notes: `Packaging used for batch`,
          batchId,
        });
      }

      await tx.batch.update({
        where: { id: batchId },
        data: {
          status: "PACKAGED",
          packageDate: new Date(),
          productId: product.id,
        },
      });

      await tx.batchEvent.create({
        data: {
          batchId,
          type: "PACKAGED",
          notes: notes ?? `Packaged ${units} units of ${product.name}`,
          metadata: { productId, units, packagingItemId, packagingPerUnit } as Prisma.InputJsonValue,
        },
      });
    });
    revalidateBatches(batchId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toErrorMessage(e) };
  }
}

export async function addBatchNote(input: unknown): Promise<ActionResult> {
  const parsed = batchNoteSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { batchId, notes } = parsed.data;
  try {
    await prisma.batchEvent.create({
      data: { batchId, type: "NOTE_ADDED", notes },
    });
    revalidateBatches(batchId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toErrorMessage(e) };
  }
}
