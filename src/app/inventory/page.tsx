import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { InventoryClient } from "./inventory-client";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const items = await prisma.inventoryItem.findMany({
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Raw ingredients, packaging materials and finished goods. Quantities only change through stock movements."
      />
      <InventoryClient items={items} />
    </div>
  );
}
