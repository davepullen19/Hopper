"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { DataTable } from "@/components/data-table";
import { Field } from "@/components/form-field";
import { ConfirmButton } from "@/components/confirm-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { OrderStatusBadge } from "@/components/status-badge";
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
import { orderSchema, type OrderInput } from "@/lib/validations";
import { formatDate, humanize } from "@/lib/utils";
import { createOrder, updateOrder, deleteOrder } from "@/app/actions/orders";

type Option = { id: string; name: string };
type ProductOption = { id: string; name: string; unitSize: string };

type OrderRow = {
  id: string;
  orderNumber: string;
  status: string;
  requestedDeliveryDate: Date | null;
  customer: { name: string };
  lineItems: { quantity: number; allocatedQuantity: number }[];
};

export type OrderDefaults = {
  id: string;
  customerId: string;
  requestedDeliveryDate: Date | null;
  notes: string | null;
  lineItems: { productId: string; quantity: number }[];
};

function toDateInput(d: Date | null | undefined) {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}

export function OrderDialog({
  order,
  customers,
  products,
  open,
  onOpenChange,
}: {
  order?: OrderDefaults;
  customers: Option[];
  products: ProductOption[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OrderInput>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customerId: order?.customerId ?? "",
      requestedDeliveryDate: toDateInput(order?.requestedDeliveryDate),
      notes: order?.notes ?? "",
      lineItems: order?.lineItems ?? [{ productId: "", quantity: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "lineItems",
  });

  async function onSubmit(values: OrderInput) {
    const res = order
      ? await updateOrder(order.id, values)
      : await createOrder(values);
    if (res.ok) {
      toast.success(order ? "Order updated" : "Order created");
      reset();
      onOpenChange(false);
      router.refresh();
    } else {
      toast.error(res.error ?? "Failed");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{order ? "Edit order" : "New order"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Customer" required error={errors.customerId?.message}>
              <Select
                value={watch("customerId")}
                onValueChange={(v) => setValue("customerId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Requested delivery date">
              <Input type="date" {...register("requestedDeliveryDate")} />
            </Field>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Line items</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ productId: "", quantity: 1 })}
              >
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
            <div className="space-y-2">
              {fields.map((f, idx) => (
                <div key={f.id} className="flex items-end gap-2">
                  <div className="flex-1">
                    <Select
                      value={watch(`lineItems.${idx}.productId`)}
                      onValueChange={(v) =>
                        setValue(`lineItems.${idx}.productId`, v)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} ({p.unitSize})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-28">
                    <Input
                      type="number"
                      placeholder="Qty"
                      {...register(`lineItems.${idx}.quantity`)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(idx)}
                    disabled={fields.length === 1}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            {errors.lineItems && (
              <p className="text-xs font-medium text-destructive">
                {errors.lineItems.message ??
                  "Each line needs a product and a quantity > 0."}
              </p>
            )}
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
              {isSubmitting ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function OrdersClient({
  orders,
  customers,
  products,
}: {
  orders: OrderRow[];
  customers: Option[];
  products: ProductOption[];
}) {
  const [createOpen, setCreateOpen] = useState(false);

  const columns: ColumnDef<OrderRow>[] = [
    {
      accessorKey: "orderNumber",
      header: "Order",
      cell: ({ row }) => (
        <Link
          href={`/orders/${row.original.id}`}
          className="font-medium hover:underline"
        >
          {row.original.orderNumber}
        </Link>
      ),
    },
    {
      id: "customer",
      header: "Customer",
      cell: ({ row }) => row.original.customer.name,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <OrderStatusBadge status={row.original.status} />,
    },
    {
      id: "lines",
      header: "Items",
      cell: ({ row }) => {
        const total = row.original.lineItems.reduce(
          (s, li) => s + li.quantity,
          0
        );
        const alloc = row.original.lineItems.reduce(
          (s, li) => s + li.allocatedQuantity,
          0
        );
        return (
          <span>
            {alloc}/{total} allocated
          </span>
        );
      },
    },
    {
      id: "delivery",
      header: "Delivery",
      cell: ({ row }) => formatDate(row.original.requestedDeliveryDate),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        return (
          <div className="flex justify-end gap-1">
            <ConfirmButton
              title="Delete order?"
              description={`Delete ${row.original.orderNumber}. Allocated orders must be cancelled first.`}
              confirmLabel="Delete"
              successMessage="Order deleted"
              action={() => deleteOrder(row.original.id)}
              trigger={
                <Button variant="ghost" size="icon">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              }
            />
          </div>
        );
      },
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={orders}
        searchPlaceholder="Search orders…"
        toolbar={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New order
          </Button>
        }
      />
      <OrderDialog
        customers={customers}
        products={products}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </>
  );
}
