import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { OrdersClient } from "./orders-client";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const [orders, customers, products] = await Promise.all([
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { name: true } },
        lineItems: true,
      },
    }),
    prisma.customer.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, unitSize: true },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Sales orders. Allocation removes finished goods from stock."
      />
      <OrdersClient orders={orders} customers={customers} products={products} />
    </div>
  );
}
