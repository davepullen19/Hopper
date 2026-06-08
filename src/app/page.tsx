import Link from "next/link";
import {
  FlaskConical,
  AlertTriangle,
  PackageCheck,
  ShoppingCart,
} from "lucide-react";

import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
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
import { BatchStatusBadge, MovementTypeBadge } from "@/components/status-badge";
import { formatDateTime, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

const ACTIVE_BATCH_STATUSES = [
  "PLANNED",
  "BREWED",
  "FERMENTING",
  "CONDITIONING",
] as const;

export default async function DashboardPage() {
  const [
    activeBatches,
    lowStock,
    finishedGoods,
    awaitingOrders,
    recentMovements,
  ] = await Promise.all([
    prisma.batch.findMany({
      where: { status: { in: [...ACTIVE_BATCH_STATUSES] } },
      orderBy: { createdAt: "desc" },
      include: { product: true },
    }),
    prisma.$queryRaw<
      { id: string; name: string; currentQuantity: number; reorderThreshold: number; unitOfMeasure: string }[]
    >`SELECT id, name, "currentQuantity", "reorderThreshold", "unitOfMeasure"
       FROM "InventoryItem"
       WHERE "reorderThreshold" > 0 AND "currentQuantity" <= "reorderThreshold"
       ORDER BY ("currentQuantity" - "reorderThreshold") ASC`,
    prisma.inventoryItem.findMany({
      where: { type: "FINISHED_GOODS", currentQuantity: { gt: 0 } },
      orderBy: { currentQuantity: "desc" },
    }),
    prisma.order.findMany({
      where: { status: { in: ["DRAFT", "CONFIRMED"] } },
      include: { customer: true, lineItems: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.stockMovement.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { inventoryItem: true },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Production & inventory at a glance."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active batches"
          value={activeBatches.length}
          icon={FlaskConical}
          href="/batches"
        />
        <StatCard
          label="Low inventory items"
          value={lowStock.length}
          icon={AlertTriangle}
          href="/inventory"
          accent={lowStock.length > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Finished goods available"
          value={finishedGoods.length}
          icon={PackageCheck}
          href="/inventory"
          accent="success"
        />
        <StatCard
          label="Orders awaiting stock"
          value={awaitingOrders.length}
          icon={ShoppingCart}
          href="/orders"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Active batches</CardTitle>
          </CardHeader>
          <CardContent>
            {activeBatches.length === 0 ? (
              <Empty>No active batches.</Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeBatches.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">
                        <Link href={`/batches/${b.id}`} className="hover:underline">
                          {b.code}
                        </Link>
                      </TableCell>
                      <TableCell>{b.name}</TableCell>
                      <TableCell>
                        <BatchStatusBadge status={b.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Low inventory</CardTitle>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <Empty>Everything is above its reorder threshold.</Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">On hand</TableHead>
                    <TableHead className="text-right">Reorder at</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStock.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{i.name}</TableCell>
                      <TableCell className="text-right">
                        {formatNumber(i.currentQuantity)} {i.unitOfMeasure}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatNumber(i.reorderThreshold)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Finished goods available</CardTitle>
          </CardHeader>
          <CardContent>
            {finishedGoods.length === 0 ? (
              <Empty>No finished goods in stock yet.</Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {finishedGoods.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{i.name}</TableCell>
                      <TableCell className="text-right">
                        {formatNumber(i.currentQuantity)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Orders awaiting stock</CardTitle>
          </CardHeader>
          <CardContent>
            {awaitingOrders.length === 0 ? (
              <Empty>No open orders.</Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Lines</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {awaitingOrders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium">
                        <Link href={`/orders/${o.id}`} className="hover:underline">
                          {o.orderNumber}
                        </Link>
                      </TableCell>
                      <TableCell>{o.customer.name}</TableCell>
                      <TableCell className="text-right">
                        {o.lineItems.length}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent stock movements</CardTitle>
        </CardHeader>
        <CardContent>
          {recentMovements.length === 0 ? (
            <Empty>No stock movements recorded yet.</Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentMovements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDateTime(m.createdAt)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {m.inventoryItem.name}
                    </TableCell>
                    <TableCell>
                      <MovementTypeBadge type={m.type} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={m.quantity >= 0 ? "success" : "warning"}>
                        {m.quantity >= 0 ? "+" : ""}
                        {formatNumber(m.quantity)}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[240px] truncate text-muted-foreground">
                      {m.notes ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>
  );
}
