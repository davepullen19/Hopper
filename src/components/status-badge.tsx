import { Badge, type BadgeProps } from "@/components/ui/badge";
import { humanize } from "@/lib/utils";

const batchVariant: Record<string, BadgeProps["variant"]> = {
  PLANNED: "muted",
  BREWED: "info",
  FERMENTING: "info",
  CONDITIONING: "info",
  PACKAGED: "warning",
  COMPLETE: "success",
  DUMPED: "destructive",
};

const orderVariant: Record<string, BadgeProps["variant"]> = {
  DRAFT: "muted",
  CONFIRMED: "info",
  ALLOCATED: "warning",
  FULFILLED: "success",
  CANCELLED: "destructive",
};

const movementVariant: Record<string, BadgeProps["variant"]> = {
  PURCHASE: "success",
  RETURN: "success",
  PRODUCE: "success",
  CONSUME: "warning",
  PACKAGE: "warning",
  ALLOCATE: "warning",
  ADJUSTMENT: "muted",
};

export function BatchStatusBadge({ status }: { status: string }) {
  return <Badge variant={batchVariant[status] ?? "secondary"}>{humanize(status)}</Badge>;
}

export function OrderStatusBadge({ status }: { status: string }) {
  return <Badge variant={orderVariant[status] ?? "secondary"}>{humanize(status)}</Badge>;
}

export function MovementTypeBadge({ type }: { type: string }) {
  return <Badge variant={movementVariant[type] ?? "secondary"}>{humanize(type)}</Badge>;
}
