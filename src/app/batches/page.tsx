import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { BatchesClient } from "./batches-client";

export const dynamic = "force-dynamic";

export default async function BatchesPage() {
  const [batches, recipes, products] = await Promise.all([
    prisma.batch.findMany({
      orderBy: { createdAt: "desc" },
      include: { product: { select: { name: true } } },
    }),
    prisma.recipe.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, productId: true, targetBatchVolume: true },
    }),
    prisma.product.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Batches"
        description="Production runs. Every action writes a batch event."
      />
      <BatchesClient batches={batches} recipes={recipes} products={products} />
    </div>
  );
}
