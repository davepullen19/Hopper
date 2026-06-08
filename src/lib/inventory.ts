import type { MovementType, Prisma, PrismaClient } from "@prisma/client";

/**
 * Convert a movement type + user-entered magnitude into a signed delta that is
 * applied to InventoryItem.currentQuantity (and stored on the StockMovement).
 *
 * Stock IN  (+): PURCHASE, RETURN, PRODUCE
 * Stock OUT (-): CONSUME, PACKAGE, ALLOCATE
 * ADJUSTMENT: signed exactly as entered (can be + or -).
 */
export function signedDelta(type: MovementType, quantity: number): number {
  if (type === "ADJUSTMENT") return quantity;
  const magnitude = Math.abs(quantity);
  switch (type) {
    case "PURCHASE":
    case "RETURN":
    case "PRODUCE":
      return magnitude;
    case "CONSUME":
    case "PACKAGE":
    case "ALLOCATE":
      return -magnitude;
    default:
      return quantity;
  }
}

type TxClient = Prisma.TransactionClient | PrismaClient;

/**
 * The ONLY way inventory quantity changes: append an immutable StockMovement and
 * update the cached currentQuantity in the same transaction. Never mutate
 * currentQuantity without recording a movement.
 */
export async function recordMovement(
  tx: TxClient,
  args: {
    inventoryItemId: string;
    type: MovementType;
    /** Magnitude (or signed value for ADJUSTMENT). */
    quantity: number;
    notes?: string | null;
    batchId?: string | null;
    orderId?: string | null;
  }
) {
  const delta = signedDelta(args.type, args.quantity);

  const movement = await tx.stockMovement.create({
    data: {
      inventoryItemId: args.inventoryItemId,
      type: args.type,
      quantity: delta,
      notes: args.notes ?? null,
      batchId: args.batchId ?? null,
      orderId: args.orderId ?? null,
    },
  });

  await tx.inventoryItem.update({
    where: { id: args.inventoryItemId },
    data: { currentQuantity: { increment: delta } },
  });

  return movement;
}
