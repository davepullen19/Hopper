"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Field } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { batchSchema, type BatchInput } from "@/lib/validations";
import { createBatch, updateBatch } from "@/app/actions/batches";

export type RecipeOption = {
  id: string;
  name: string;
  productId: string | null;
  targetBatchVolume: number;
};
export type ProductOption = { id: string; name: string };

export type BatchDefaults = {
  id: string;
  code: string;
  name: string;
  recipeId: string | null;
  productId: string | null;
  plannedVolume: number;
  vessel: string | null;
  brewDate: Date | null;
  notes: string | null;
};

function toDateInput(d: Date | null | undefined) {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

export function BatchDialog({
  batch,
  recipes,
  products,
  open,
  onOpenChange,
}: {
  batch?: BatchDefaults;
  recipes: RecipeOption[];
  products: ProductOption[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BatchInput>({
    resolver: zodResolver(batchSchema),
    defaultValues: {
      code: batch?.code ?? "",
      name: batch?.name ?? "",
      recipeId: batch?.recipeId ?? "",
      productId: batch?.productId ?? "",
      plannedVolume: batch?.plannedVolume ?? 0,
      vessel: batch?.vessel ?? "",
      brewDate: toDateInput(batch?.brewDate),
      notes: batch?.notes ?? "",
    },
  });

  function onRecipeChange(v: string) {
    const id = v === "none" ? "" : v;
    setValue("recipeId", id);
    const recipe = recipes.find((r) => r.id === id);
    if (recipe) {
      if (recipe.productId) setValue("productId", recipe.productId);
      if (!watch("plannedVolume"))
        setValue("plannedVolume", recipe.targetBatchVolume);
    }
  }

  async function onSubmit(values: BatchInput) {
    const res = batch
      ? await updateBatch(batch.id, values)
      : await createBatch(values);
    if (res.ok) {
      toast.success(batch ? "Batch updated" : "Batch created");
      reset();
      onOpenChange(false);
      router.refresh();
    } else {
      toast.error(res.error ?? "Failed");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{batch ? "Edit batch" : "New batch"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Batch code" required error={errors.code?.message}>
              <Input {...register("code")} placeholder="B-2026-014" />
            </Field>
            <Field label="Name" required error={errors.name?.message}>
              <Input {...register("name")} placeholder="Hazy Pale #14" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Recipe">
              <Select
                value={watch("recipeId") || "none"}
                onValueChange={onRecipeChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {recipes.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Product">
              <Select
                value={watch("productId") || "none"}
                onValueChange={(v) =>
                  setValue("productId", v === "none" ? "" : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Planned volume (L)"
              required
              error={errors.plannedVolume?.message}
            >
              <Input type="number" step="any" {...register("plannedVolume")} />
            </Field>
            <Field label="Vessel / tank" error={errors.vessel?.message}>
              <Input {...register("vessel")} placeholder="FV3" />
            </Field>
          </div>
          <Field label="Brew date" error={errors.brewDate?.message}>
            <Input type="date" {...register("brewDate")} />
          </Field>
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
