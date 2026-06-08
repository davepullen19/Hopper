"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { recipeSchema } from "@/lib/validations";
import { type ActionResult, toErrorMessage } from "@/lib/action-result";

function revalidateRecipes() {
  revalidatePath("/recipes");
  revalidatePath("/batches");
}

export async function createRecipe(input: unknown): Promise<ActionResult> {
  const parsed = recipeSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { ingredients, productId, ...rest } = parsed.data;
  try {
    await prisma.recipe.create({
      data: {
        ...rest,
        productId: productId || null,
        ingredients: {
          create: ingredients.map((i) => ({
            inventoryItemId: i.inventoryItemId,
            quantity: i.quantity,
            notes: i.notes ?? null,
          })),
        },
      },
    });
    revalidateRecipes();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toErrorMessage(e, "Duplicate ingredient in recipe") };
  }
}

export async function updateRecipe(
  id: string,
  input: unknown
): Promise<ActionResult> {
  const parsed = recipeSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { ingredients, productId, ...rest } = parsed.data;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.recipe.update({
        where: { id },
        data: { ...rest, productId: productId || null },
      });
      // Replace the ingredient set wholesale — simplest correct approach.
      await tx.recipeIngredient.deleteMany({ where: { recipeId: id } });
      if (ingredients.length) {
        await tx.recipeIngredient.createMany({
          data: ingredients.map((i) => ({
            recipeId: id,
            inventoryItemId: i.inventoryItemId,
            quantity: i.quantity,
            notes: i.notes ?? null,
          })),
        });
      }
    });
    revalidateRecipes();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toErrorMessage(e, "Duplicate ingredient in recipe") };
  }
}

export async function deleteRecipe(id: string): Promise<ActionResult> {
  try {
    await prisma.recipe.delete({ where: { id } });
    revalidateRecipes();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toErrorMessage(e) };
  }
}
