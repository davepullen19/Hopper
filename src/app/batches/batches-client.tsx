"use client";

import { useState } from "react";
import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { Batch } from "@prisma/client";

import { DataTable } from "@/components/data-table";
import { ConfirmButton } from "@/components/confirm-button";
import { Button } from "@/components/ui/button";
import { BatchStatusBadge } from "@/components/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BatchDialog,
  type RecipeOption,
  type ProductOption,
} from "./batch-dialog";
import { deleteBatch } from "@/app/actions/batches";
import { formatDate, formatNumber, humanize } from "@/lib/utils";

type BatchRow = Batch & { product: { name: string } | null };

const STATUSES = [
  "PLANNED",
  "BREWED",
  "FERMENTING",
  "CONDITIONING",
  "PACKAGED",
  "COMPLETE",
  "DUMPED",
] as const;

export function BatchesClient({
  batches,
  recipes,
  products,
}: {
  batches: BatchRow[];
  recipes: RecipeOption[];
  products: ProductOption[];
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<BatchRow | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const data =
    statusFilter === "ALL"
      ? batches
      : batches.filter((b) => b.status === statusFilter);

  const columns: ColumnDef<BatchRow>[] = [
    {
      accessorKey: "code",
      header: "Code",
      cell: ({ row }) => (
        <Link
          href={`/batches/${row.original.id}`}
          className="font-medium hover:underline"
        >
          {row.original.code}
        </Link>
      ),
    },
    { accessorKey: "name", header: "Name" },
    {
      id: "product",
      header: "Product",
      cell: ({ row }) => row.original.product?.name ?? "—",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <BatchStatusBadge status={row.original.status} />,
    },
    {
      id: "volume",
      header: "Volume (L)",
      cell: ({ row }) => (
        <span>
          {formatNumber(row.original.plannedVolume)}
          {row.original.actualVolume != null && (
            <span className="text-muted-foreground">
              {" "}
              / {formatNumber(row.original.actualVolume)}
            </span>
          )}
        </span>
      ),
    },
    {
      id: "brewDate",
      header: "Brew date",
      cell: ({ row }) => formatDate(row.original.brewDate),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setEditing(row.original)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <ConfirmButton
            title="Delete batch?"
            description={`Delete batch "${row.original.code}" and its events.`}
            confirmLabel="Delete"
            successMessage="Batch deleted"
            action={() => deleteBatch(row.original.id)}
            trigger={
              <Button variant="ghost" size="icon">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            }
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={data}
        searchPlaceholder="Search batches…"
        toolbar={
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {humanize(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New batch
            </Button>
          </div>
        }
      />
      <BatchDialog
        recipes={recipes}
        products={products}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
      {editing && (
        <BatchDialog
          batch={{
            id: editing.id,
            code: editing.code,
            name: editing.name,
            recipeId: editing.recipeId,
            productId: editing.productId,
            plannedVolume: editing.plannedVolume,
            vessel: editing.vessel,
            brewDate: editing.brewDate,
            notes: editing.notes,
          }}
          recipes={recipes}
          products={products}
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
        />
      )}
    </>
  );
}
