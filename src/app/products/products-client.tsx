"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@prisma/client";

import { DataTable } from "@/components/data-table";
import { Field } from "@/components/form-field";
import { ConfirmButton } from "@/components/confirm-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { productSchema, type ProductInput } from "@/lib/validations";
import { humanize, formatCurrency } from "@/lib/utils";
import {
  createProduct,
  updateProduct,
  deleteProduct,
} from "@/app/actions/products";

const PACKAGE_TYPES = ["KEG", "CASK", "CAN", "BOTTLE", "DRAFT"] as const;

function ProductDialog({
  product,
  open,
  onOpenChange,
}: {
  product?: Product;
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
  } = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name ?? "",
      style: product?.style ?? "",
      sku: product?.sku ?? "",
      packageType: product?.packageType ?? "CAN",
      unitSize: product?.unitSize ?? "",
      price: product?.price ?? undefined,
      active: product?.active ?? true,
    },
  });

  async function onSubmit(values: ProductInput) {
    const res = product
      ? await updateProduct(product.id, values)
      : await createProduct(values);
    if (res.ok) {
      toast.success(product ? "Product updated" : "Product created");
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
          <DialogTitle>{product ? "Edit product" : "New product"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Name" required error={errors.name?.message}>
            <Input {...register("name")} placeholder="Hazy Pale Ale" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Style" required error={errors.style?.message}>
              <Input {...register("style")} placeholder="New England IPA" />
            </Field>
            <Field label="SKU" required error={errors.sku?.message}>
              <Input {...register("sku")} placeholder="HPA-330" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Package type" required>
              <Select
                value={watch("packageType")}
                onValueChange={(v) =>
                  setValue("packageType", v as ProductInput["packageType"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PACKAGE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {humanize(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Unit size" required error={errors.unitSize?.message}>
              <Input {...register("unitSize")} placeholder="330ml" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Price (£)" error={errors.price?.message}>
              <Input
                type="number"
                step="0.01"
                {...register("price")}
                placeholder="1.80"
              />
            </Field>
            <Field label="Status">
              <Select
                value={watch("active") ? "true" : "false"}
                onValueChange={(v) => setValue("active", v === "true")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
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

export function ProductsClient({ products }: { products: Product[] }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const columns: ColumnDef<Product>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    { accessorKey: "style", header: "Style" },
    { accessorKey: "sku", header: "SKU" },
    {
      accessorKey: "packageType",
      header: "Package",
      cell: ({ row }) => humanize(row.original.packageType),
    },
    { accessorKey: "unitSize", header: "Unit size" },
    {
      accessorKey: "price",
      header: "Price",
      cell: ({ row }) => formatCurrency(row.original.price),
    },
    {
      accessorKey: "active",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.active ? "success" : "muted"}>
          {row.original.active ? "Active" : "Inactive"}
        </Badge>
      ),
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
            title="Delete product?"
            description={`Delete "${row.original.name}". This can't be undone.`}
            confirmLabel="Delete"
            successMessage="Product deleted"
            action={() => deleteProduct(row.original.id)}
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
        data={products}
        searchPlaceholder="Search products…"
        toolbar={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New product
          </Button>
        }
      />
      <ProductDialog open={createOpen} onOpenChange={setCreateOpen} />
      {editing && (
        <ProductDialog
          product={editing}
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
        />
      )}
    </>
  );
}
