import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { prisma } from "@/lib/db";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { OrderStatusBadge, MovementTypeBadge } from "@/components/status-badge";
import { formatDate, formatDateTime, formatNumber } from "@/lib/utils";
import { OrderActions } from "./order-actions";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [order, customers, products] = await Promise.all([
    prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        lineItems: {
          include: {
            product: { include: { inventoryItem: true } },
          },
        },
        movements: {
          orderBy: { createdAt: "desc" },
          include: { inventoryItem: { select: { name: true } } },
        },
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

  if (!order) notFound();

  const editDefaults = {
    id: order.id,
    customerId: order.customerId,
    requestedDeliveryDate: order.requestedDeliveryDate,
    notes: order.notes,
    lineItems: order.lineItems.map((li) => ({
      productId: li.productId,
      quantity: li.quantity,
    })),
  };

  return (
    <div>
      <Link
        href="/orders"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Orders
      </Link>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {order.orderNumber}
            </h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="text-sm text-muted-foreground">{order.customer.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Line items</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Ordered</TableHead>
                    <TableHead className="text-right">Allocated</TableHead>
                    <TableHead className="text-right">In stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.lineItems.map((li) => {
                    const stock = li.product.inventoryItem?.currentQuantity ?? 0;
                    const fullyAllocated = li.allocatedQuantity >= li.quantity;
                    return (
                      <TableRow key={li.id}>
                        <TableCell className="font-medium">
                          {li.product.name}{" "}
                          <span className="text-muted-foreground">
                            ({li.product.unitSize})
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {li.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={fullyAllocated ? "success" : "warning"}>
                            {li.allocatedQuantity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatNumber(stock)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stock movements</CardTitle>
            </CardHeader>
            <CardContent>
              {order.movements.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No allocations yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Change</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.movements.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {formatDateTime(m.createdAt)}
                        </TableCell>
                        <TableCell>{m.inventoryItem.name}</TableCell>
                        <TableCell>
                          <MovementTypeBadge type={m.type} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={m.quantity >= 0 ? "success" : "warning"}
                          >
                            {m.quantity >= 0 ? "+" : ""}
                            {formatNumber(m.quantity)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <OrderActions
            orderId={order.id}
            status={order.status}
            editDefaults={editDefaults}
            customers={customers}
            products={products}
          />

          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Customer" value={order.customer.name} />
              <Row
                label="Contact"
                value={order.customer.contactName ?? "—"}
              />
              <Row label="Email" value={order.customer.email ?? "—"} />
              <Row
                label="Requested delivery"
                value={formatDate(order.requestedDeliveryDate)}
              />
              {order.notes && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Notes
                  </p>
                  <p className="mt-0.5">{order.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
