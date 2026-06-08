"use client";

import { useState } from "react";
import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { MovementTypeBadge } from "@/components/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateTime, formatNumber, humanize } from "@/lib/utils";

export type MovementRow = {
  id: string;
  createdAt: Date;
  itemName: string;
  unit: string;
  type: string;
  quantity: number;
  notes: string | null;
  batchId: string | null;
  batchCode: string | null;
  orderId: string | null;
  orderNumber: string | null;
};

const MOVEMENT_TYPES = [
  "PURCHASE",
  "CONSUME",
  "PRODUCE",
  "PACKAGE",
  "ADJUSTMENT",
  "ALLOCATE",
  "RETURN",
] as const;

export function StockMovementsClient({
  movements,
}: {
  movements: MovementRow[];
}) {
  const [typeFilter, setTypeFilter] = useState("ALL");
  const data =
    typeFilter === "ALL"
      ? movements
      : movements.filter((m) => m.type === typeFilter);

  const columns: ColumnDef<MovementRow>[] = [
    {
      accessorKey: "createdAt",
      header: "When",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {formatDateTime(row.original.createdAt)}
        </span>
      ),
    },
    {
      accessorKey: "itemName",
      header: "Item",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.itemName}</span>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => <MovementTypeBadge type={row.original.type} />,
    },
    {
      accessorKey: "quantity",
      header: "Change",
      cell: ({ row }) => (
        <Badge variant={row.original.quantity >= 0 ? "success" : "warning"}>
          {row.original.quantity >= 0 ? "+" : ""}
          {formatNumber(row.original.quantity)} {row.original.unit}
        </Badge>
      ),
    },
    {
      id: "ref",
      header: "Reference",
      cell: ({ row }) =>
        row.original.batchId ? (
          <Link
            href={`/batches/${row.original.batchId}`}
            className="text-sm hover:underline"
          >
            Batch {row.original.batchCode}
          </Link>
        ) : row.original.orderId ? (
          <Link
            href={`/orders/${row.original.orderId}`}
            className="text-sm hover:underline"
          >
            Order {row.original.orderNumber}
          </Link>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "notes",
      header: "Notes",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.notes ?? "—"}</span>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      searchPlaceholder="Search movements…"
      pageSize={20}
      toolbar={
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All types</SelectItem>
            {MOVEMENT_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {humanize(t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    />
  );
}
