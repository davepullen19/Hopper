"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { orderSchema } from "@/lib/validations";
import { type ActionResult, toErrorMessage } from "@/lib/action-result";
import { recordMovement } from "@/lib/inventory";

function revalidateOrders(id?: string) {
  revalidatePath("/orders");
  if (id) revalidatePath(`/orders/${id}`);
  revalidatePath("/inventory");
  revalidatePath("/stock-movements");
  revalidatePath("/");
}

async function nextOrderNumber(tx: {
  order: { count: () => Promise<number> };
}) {
  const count = await tx.order.count();
  return `SO-${1000 + count + 1}`;
}

export async function createOrder(input: unknown): Promise<ActionResult<string>> {
  const parsed = orderSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { customerId, requestedDeliveryDate, notes, lineItems } = parsed.data;
  try {
    const order = await prisma.$transaction(async (tx) => {
      const orderNumber = await nextOrderNumber(tx);
      return tx.order.create({
        data: {
          orderNumber,
          customerId,
          requestedDeliveryDate: requestedDeliveryDate
            ? new Date(requestedDeliveryDate)
            : null,
          notes: notes ?? null,
          status: "DRAFT",
          lineItems: {
            create: lineItems.map((li) => ({
              productId: li.productId,
              quantity: li.quantity,
            })),
          },
        },
      });
    });
    revalidateOrders(order.id);
    return { ok: true, data: order.id };
  } catch (e) {
    return { ok: false, error: toErrorMessage(e) };
  }
}

export async function updateOrder(
  id: string,
  input: unknown
): Promise<ActionResult> {
  const parsed = orderSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { customerId, requestedDeliveryDate, notes, lineItems } = parsed.data;
  try {
    const existing = await prisma.order.findUniqueOrThrow({ where: { id } });
    if (existing.status !== "DRAFT")
      return {
        ok: false,
        error: "Only draft orders can be edited. Cancel it to make changes.",
      };
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: {
          customerId,
          requestedDeliveryDate: requestedDeliveryDate
            ? new Date(requestedDeliveryDate)
            : null,
          notes: notes ?? null,
        },
      });
      await tx.orderLineItem.deleteMany({ where: { orderId: id } });
      await tx.orderLineItem.createMany({
        data: lineItems.map((li) => ({
          orderId: id,
          productId: li.productId,
          quantity: li.quantity,
        })),
      });
    });
    revalidateOrders(id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toErrorMessage(e) };
  }
}

export async function deleteOrder(id: string): Promise<ActionResult> {
  try {
    const order = await prisma.order.findUniqueOrThrow({
      where: { id },
      include: { lineItems: true },
    });
    if (order.lineItems.some((li) => li.allocatedQuantity > 0))
      return {
        ok: false,
        error: "Order has allocated stock. Cancel it first to return stock.",
      };
    await prisma.order.delete({ where: { id } });
    revalidateOrders();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toErrorMessage(e) };
  }
}

export async function confirmOrder(id: string): Promise<ActionResult> {
  try {
    await prisma.order.update({
      where: { id },
      data: { status: "CONFIRMED" },
    });
    revalidateOrders(id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toErrorMessage(e) };
  }
}

/**
 * Allocate available finished goods to the order's line items. Each allocation
 * removes stock via an ALLOCATE movement. Partial allocation is allowed when
 * stock is short; the order is marked ALLOCATED only when every line is filled.
 */
export async function allocateOrder(id: string): Promise<ActionResult> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUniqueOrThrow({
        where: { id },
        include: {
          lineItems: { include: { product: { include: { inventoryItem: true } } } },
        },
      });
      if (order.status === "CANCELLED" || order.status === "FULFILLED")
        throw new Error(`Cannot allocate a ${order.status.toLowerCase()} order.`);

      let allFilled = true;
      let anyAllocated = false;

      for (const li of order.lineItems) {
        const need = li.quantity - li.allocatedQuantity;
        if (need <= 0) continue;
        const fgItem = li.product.inventoryItem;
        const available = fgItem ? Math.floor(fgItem.currentQuantity) : 0;
        const toAllocate = Math.min(need, available);

        if (toAllocate > 0 && fgItem) {
          await recordMovement(tx, {
            inventoryItemId: fgItem.id,
            type: "ALLOCATE",
            quantity: toAllocate,
            notes: `Allocated to order ${order.orderNumber}`,
            orderId: id,
          });
          await tx.orderLineItem.update({
            where: { id: li.id },
            data: { allocatedQuantity: { increment: toAllocate } },
          });
          anyAllocated = true;
        }
        if (toAllocate < need) allFilled = false;
      }

      await tx.order.update({
        where: { id },
        data: { status: allFilled ? "ALLOCATED" : "CONFIRMED" },
      });

      return { allFilled, anyAllocated };
    });

    revalidateOrders(id);
    if (!result.anyAllocated)
      return { ok: false, error: "No finished-goods stock available to allocate." };
    if (!result.allFilled)
      return {
        ok: true,
        error: "Partially allocated — not enough finished goods for all lines.",
      };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toErrorMessage(e) };
  }
}

export async function fulfillOrder(id: string): Promise<ActionResult> {
  try {
    const order = await prisma.order.findUniqueOrThrow({
      where: { id },
      include: { lineItems: true },
    });
    if (order.status === "CANCELLED")
      return { ok: false, error: "Cannot fulfill a cancelled order." };
    const fullyAllocated = order.lineItems.every(
      (li) => li.allocatedQuantity >= li.quantity
    );
    if (!fullyAllocated)
      return {
        ok: false,
        error: "Order is not fully allocated yet. Allocate stock first.",
      };
    await prisma.order.update({ where: { id }, data: { status: "FULFILLED" } });
    revalidateOrders(id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toErrorMessage(e) };
  }
}

/** Cancel an order, returning any allocated finished goods to stock. */
export async function cancelOrder(id: string): Promise<ActionResult> {
  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUniqueOrThrow({
        where: { id },
        include: {
          lineItems: { include: { product: { include: { inventoryItem: true } } } },
        },
      });
      if (order.status === "CANCELLED") return;

      for (const li of order.lineItems) {
        if (li.allocatedQuantity > 0 && li.product.inventoryItem) {
          await recordMovement(tx, {
            inventoryItemId: li.product.inventoryItem.id,
            type: "RETURN",
            quantity: li.allocatedQuantity,
            notes: `Returned from cancelled order ${order.orderNumber}`,
            orderId: id,
          });
          await tx.orderLineItem.update({
            where: { id: li.id },
            data: { allocatedQuantity: 0 },
          });
        }
      }
      await tx.order.update({ where: { id }, data: { status: "CANCELLED" } });
    });
    revalidateOrders(id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toErrorMessage(e) };
  }
}
