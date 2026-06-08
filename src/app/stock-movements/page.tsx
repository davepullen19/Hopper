import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { StockMovementsClient } from "./stock-movements-client";

export const dynamic = "force-dynamic";

export default async function StockMovementsPage() {
  const movements = await prisma.stockMovement.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    include: {
      inventoryItem: { select: { name: true, unitOfMeasure: true } },
      batch: { select: { id: true, code: true } },
      order: { select: { id: true, orderNumber: true } },
    },
  });

  const rows = movements.map((m) => ({
    id: m.id,
    createdAt: m.createdAt,
    itemName: m.inventoryItem.name,
    unit: m.inventoryItem.unitOfMeasure,
    type: m.type,
    quantity: m.quantity,
    notes: m.notes,
    batchId: m.batch?.id ?? null,
    batchCode: m.batch?.code ?? null,
    orderId: m.order?.id ?? null,
    orderNumber: m.order?.orderNumber ?? null,
  }));

  return (
    <div>
      <PageHeader
        title="Stock Movements"
        description="Immutable ledger — every inventory change is recorded here."
      />
      <StockMovementsClient movements={rows} />
    </div>
  );
}
