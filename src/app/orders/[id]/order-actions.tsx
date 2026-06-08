"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Boxes, Truck, Ban, Pencil } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";
import {
  confirmOrder,
  allocateOrder,
  fulfillOrder,
  cancelOrder,
} from "@/app/actions/orders";
import {
  OrderDialog,
  type OrderDefaults,
} from "@/app/orders/orders-client";

type Option = { id: string; name: string };
type ProductOption = { id: string; name: string; unitSize: string };

export function OrderActions({
  orderId,
  status,
  editDefaults,
  customers,
  products,
}: {
  orderId: string;
  status: string;
  editDefaults: OrderDefaults;
  customers: Option[];
  products: ProductOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);

  function run(fn: () => Promise<ActionResult<unknown>>, success: string) {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        toast.success(success);
        if (res.error) toast.warning(res.error);
        router.refresh();
      } else {
        toast.error(res.error ?? "Failed");
      }
    });
  }

  const isDraft = status === "DRAFT";
  const canAllocate = status === "DRAFT" || status === "CONFIRMED";
  const canFulfill = status === "ALLOCATED";
  const closed = status === "FULFILLED" || status === "CANCELLED";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {isDraft && (
          <>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => run(() => confirmOrder(orderId), "Order confirmed")}
            >
              <CheckCircle2 className="h-4 w-4" /> Confirm order
            </Button>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="h-4 w-4" /> Edit order
            </Button>
          </>
        )}

        <Button
          disabled={pending || !canAllocate}
          onClick={() => run(() => allocateOrder(orderId), "Stock allocated")}
        >
          <Boxes className="h-4 w-4" /> Allocate stock
        </Button>

        <Button
          variant="outline"
          disabled={pending || !canFulfill}
          onClick={() => run(() => fulfillOrder(orderId), "Order fulfilled")}
        >
          <Truck className="h-4 w-4" /> Fulfill order
        </Button>

        <Button
          variant="destructive"
          disabled={pending || closed}
          onClick={() => run(() => cancelOrder(orderId), "Order cancelled")}
        >
          <Ban className="h-4 w-4" /> Cancel order
        </Button>
      </CardContent>

      <OrderDialog
        order={editDefaults}
        customers={customers}
        products={products}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </Card>
  );
}
