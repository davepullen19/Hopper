import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { RecipesClient } from "./recipes-client";

export const dynamic = "force-dynamic";

export default async function RecipesPage() {
  const [recipes, products, inventoryItems] = await Promise.all([
    prisma.recipe.findMany({
      orderBy: { name: "asc" },
      include: {
        product: { select: { name: true } },
        ingredients: {
          include: { inventoryItem: { select: { name: true, unitOfMeasure: true } } },
        },
      },
    }),
    prisma.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.inventoryItem.findMany({
      where: { type: { in: ["RAW", "PACKAGING"] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, unitOfMeasure: true },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Recipes"
        description="Bills of materials — what a batch consumes."
      />
      <RecipesClient
        recipes={recipes}
        products={products}
        inventoryItems={inventoryItems}
      />
    </div>
  );
}
