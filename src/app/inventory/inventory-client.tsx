"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil, Trash2, ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";
import type { InventoryItem } from "@prisma/client";

import { DataTable } from "@/components/data-table";
import { Field } from "@/components/form-field";
import { ConfirmButton } from "@/components/confirm-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  inventoryItemSchema,
  inventoryItemUpdateSchema,
  stockMovementSchema,
  type InventoryItemInput,
  type StockMovementInput,
} from "@/lib/validations";
import { humanize, formatNumber } from "@/lib/utils";
import {
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  createStockMovement,
} from "@/app/actions/inventory";

const TYPES = ["RAW", "PACKAGING", "FINISHED_GOODS"] as const;
const MOVEMENT_TYPES = [
  "PURCHASE",
  "CONSUME",
  "PRODUCE",
  "PACKAGE",
  "ADJUSTMENT",
  "ALLOCATE",
  "RETURN",
] as const;

function ItemDialog({
  item,
  open,
  onOpenChange,
}: {
  item?: InventoryItem;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const isEdit = !!item;
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InventoryItemInput>({
    resolver: zodResolver(isEdit ? inventoryItemUpdateSchema : inventoryItemSchema),
    defaultValues: {
      name: item?.name ?? "",
      type: item?.type ?? "RAW",
      category: item?.category ?? "",
      unitOfMeasure: item?.unitOfMeasure ?? "",
      openingQuantity: 0,
      reorderThreshold: item?.reorderThreshold ?? 0,
      supplier: item?.supplier ?? "",
    },
  });

  async function onSubmit(values: InventoryItemInput) {
    const res = item
      ? await updateInventoryItem(item.id, values)
      : await createInventoryItem(values);
    if (res.ok) {
      toast.success(item ? "Item updated" : "Item created");
      reset();
      onOpenChange(false);
    } else {
      toast.error(res.error ?? "Failed");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? "Edit item" : "New inventory item"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Name" required error={errors.name?.message}>
            <Input {...register("name")} placeholder="Citra Hops" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type" required>
              <Select
                value={watch("type")}
                onValueChange={(v) =>
                  setValue("type", v as InventoryItemInput["type"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {humanize(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Category" required error={errors.category?.message}>
              <Input {...register("category")} placeholder="Hops" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Unit of measure"
              required
              error={errors.unitOfMeasure?.message}
            >
              <Input {...register("unitOfMeasure")} placeholder="kg" />
            </Field>
            <Field label="Reorder threshold" error={errors.reorderThreshold?.message}>
              <Input type="number" step="any" {...register("reorderThreshold")} />
            </Field>
          </div>
          {!isEdit && (
            <Field
              label="Opening quantity"
              hint="Creates an opening-balance adjustment movement."
              error={errors.openingQuantity?.message}
            >
              <Input type="number" step="any" {...register("openingQuantity")} />
            </Field>
          )}
          <Field label="Supplier" error={errors.supplier?.message}>
            <Input {...register("supplier")} placeholder="Yakima Chief" />
          </Field>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MovementDialog({
  items,
  presetItemId,
  open,
  onOpenChange,
}: {
  items: InventoryItem[];
  presetItemId?: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StockMovementInput>({
    resolver: zodResolver(stockMovementSchema),
    defaultValues: {
      inventoryItemId: presetItemId ?? "",
      type: "PURCHASE",
      quantity: 0,
      notes: "",
    },
  });

  async function onSubmit(values: StockMovementInput) {
    const res = await createStockMovement(values);
    if (res.ok) {
      toast.success("Stock movement recorded");
      reset();
      onOpenChange(false);
    } else {
      toast.error(res.error ?? "Failed");
    }
  }

  const type = watch("type");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record stock movement</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Item" required error={errors.inventoryItemId?.message}>
            <Select
              value={watch("inventoryItemId")}
              onValueChange={(v) => setValue("inventoryItemId", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select item" />
              </SelectTrigger>
              <SelectContent>
                {items.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name} ({humanize(i.type)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type" required>
              <Select
                value={type}
                onValueChange={(v) =>
                  setValue("type", v as StockMovementInput["type"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MOVEMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {humanize(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field
              label="Quantity"
              required
              hint={
                type === "ADJUSTMENT"
                  ? "Use a negative value to decrease."
                  : "Magnitude — sign is set by type."
              }
              error={errors.quantity?.message}
            >
              <Input type="number" step="any" {...register("quantity")} />
            </Field>
          </div>
          <Field label="Notes" error={errors.notes?.message}>
            <Textarea {...register("notes")} rows={2} />
          </Field>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Record"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function InventoryClient({ items }: { items: InventoryItem[] }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [movementFor, setMovementFor] = useState<InventoryItem | null>(null);
  const [movementOpen, setMovementOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  const filtered =
    typeFilter === "ALL" ? items : items.filter((i) => i.type === typeFilter);

  const columns: ColumnDef<InventoryItem>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant="secondary">{humanize(row.original.type)}</Badge>
      ),
    },
    { accessorKey: "category", header: "Category" },
    {
      id: "onHand",
      header: "On hand",
      cell: ({ row }) => {
        const i = row.original;
        const low = i.reorderThreshold > 0 && i.currentQuantity <= i.reorderThreshold;
        return (
          <span className="flex items-center gap-2">
            <span className="font-medium">
              {formatNumber(i.currentQuantity)} {i.unitOfMeasure}
            </span>
            {low && <Badge variant="warning">Low</Badge>}
          </span>
        );
      },
    },
    {
      accessorKey: "reorderThreshold",
      header: "Reorder at",
      cell: ({ row }) =>
        row.original.reorderThreshold > 0
          ? formatNumber(row.original.reorderThreshold)
          : "—",
    },
    {
      accessorKey: "supplier",
      header: "Supplier",
      cell: ({ row }) => row.original.supplier ?? "—",
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            title="Record movement"
            onClick={() => {
              setMovementFor(row.original);
              setMovementOpen(true);
            }}
          >
            <ArrowLeftRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setEditing(row.original)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <ConfirmButton
            title="Delete item?"
            description={`Delete "${row.original.name}" and its movement history.`}
            confirmLabel="Delete"
            successMessage="Item deleted"
            action={() => deleteInventoryItem(row.original.id)}
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
        data={filtered}
        searchPlaceholder="Search inventory…"
        toolbar={
          <div className="flex gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All types</SelectItem>
                {TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {humanize(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                setMovementFor(null);
                setMovementOpen(true);
              }}
            >
              <ArrowLeftRight className="h-4 w-4" /> Movement
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New item
            </Button>
          </div>
        }
      />
      <ItemDialog open={createOpen} onOpenChange={setCreateOpen} />
      {editing && (
        <ItemDialog
          item={editing}
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
        />
      )}
      <MovementDialog
        items={items}
        presetItemId={movementFor?.id}
        open={movementOpen}
        onOpenChange={(o) => {
          setMovementOpen(o);
          if (!o) setMovementFor(null);
        }}
        key={movementFor?.id ?? "new"}
      />
    </>
  );
}
