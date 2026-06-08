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
import { BatchStatusBadge, MovementTypeBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime, formatNumber, humanize } from "@/lib/utils";
import { BatchActions } from "./batch-actions";

export const dynamic = "force-dynamic";

export default async function BatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [batch, products, packagingItems] = await Promise.all([
    prisma.batch.findUnique({
      where: { id },
      include: {
        recipe: {
          include: {
            ingredients: {
              include: { inventoryItem: { select: { name: true, unitOfMeasure: true } } },
            },
          },
        },
        product: true,
        events: { orderBy: { createdAt: "desc" } },
        movements: {
          orderBy: { createdAt: "desc" },
          include: { inventoryItem: { select: { name: true, unitOfMeasure: true } } },
        },
      },
    }),
    prisma.product.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, unitSize: true },
    }),
    prisma.inventoryItem.findMany({
      where: { type: "PACKAGING" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, unitOfMeasure: true },
    }),
  ]);

  if (!batch) notFound();

  const scale =
    batch.recipe && batch.recipe.targetBatchVolume > 0
      ? batch.plannedVolume / batch.recipe.targetBatchVolume
      : 1;

  return (
    <div>
      <Link
        href="/batches"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Batches
      </Link>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {batch.code}
            </h1>
            <BatchStatusBadge status={batch.status} />
          </div>
          <p className="text-sm text-muted-foreground">{batch.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <Detail label="Product" value={batch.product?.name ?? "—"} />
              <Detail label="Recipe" value={batch.recipe?.name ?? "—"} />
              <Detail label="Vessel" value={batch.vessel ?? "—"} />
              <Detail
                label="Planned volume"
                value={`${formatNumber(batch.plannedVolume)} L`}
              />
              <Detail
                label="Actual volume"
                value={
                  batch.actualVolume != null
                    ? `${formatNumber(batch.actualVolume)} L`
                    : "—"
                }
              />
              <Detail label="Brew date" value={formatDate(batch.brewDate)} />
              <Detail label="Package date" value={formatDate(batch.packageDate)} />
            </CardContent>
            {batch.notes && (
              <CardContent className="pt-0 text-sm text-muted-foreground">
                {batch.notes}
              </CardContent>
            )}
          </Card>

          {batch.recipe && (
            <Card>
              <CardHeader>
                <CardTitle>
                  Recipe ingredients{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    (scaled {scale.toFixed(2)}×)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ingredient</TableHead>
                      <TableHead className="text-right">Per recipe</TableHead>
                      <TableHead className="text-right">This batch</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batch.recipe.ingredients.map((ing) => (
                      <TableRow key={ing.id}>
                        <TableCell>{ing.inventoryItem.name}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatNumber(ing.quantity)}{" "}
                          {ing.inventoryItem.unitOfMeasure}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatNumber(ing.quantity * scale)}{" "}
                          {ing.inventoryItem.unitOfMeasure}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Stock movements</CardTitle>
            </CardHeader>
            <CardContent>
              {batch.movements.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No stock movements for this batch yet.
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
                    {batch.movements.map((m) => (
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
                            {formatNumber(m.quantity)}{" "}
                            {m.inventoryItem.unitOfMeasure}
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
          <BatchActions
            batchId={batch.id}
            status={batch.status}
            hasRecipe={!!batch.recipe}
            defaultProductId={batch.productId}
            plannedVolume={batch.plannedVolume}
            products={products}
            packagingItems={packagingItems}
          />

          <Card>
            <CardHeader>
              <CardTitle>Event timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4">
                {batch.events.map((e) => (
                  <li key={e.id} className="border-l-2 pl-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{humanize(e.type)}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(e.createdAt)}
                      </span>
                    </div>
                    {e.notes && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {e.notes}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  );
}
