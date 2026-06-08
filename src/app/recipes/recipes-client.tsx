"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table";
import { Field } from "@/components/form-field";
import { ConfirmButton } from "@/components/confirm-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { recipeSchema, type RecipeInput } from "@/lib/validations";
import { formatNumber } from "@/lib/utils";
import {
  createRecipe,
  updateRecipe,
  deleteRecipe,
} from "@/app/actions/recipes";

type Option = { id: string; name: string };
type ItemOption = { id: string; name: string; unitOfMeasure: string };

type RecipeRow = {
  id: string;
  name: string;
  targetBatchVolume: number;
  notes: string | null;
  productId: string | null;
  product: { name: string } | null;
  ingredients: {
    inventoryItemId: string;
    quantity: number;
    notes: string | null;
    inventoryItem: { name: string; unitOfMeasure: string };
  }[];
};

function RecipeDialog({
  recipe,
  products,
  inventoryItems,
  open,
  onOpenChange,
}: {
  recipe?: RecipeRow;
  products: Option[];
  inventoryItems: ItemOption[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RecipeInput>({
    resolver: zodResolver(recipeSchema),
    defaultValues: {
      name: recipe?.name ?? "",
      productId: recipe?.productId ?? "",
      targetBatchVolume: recipe?.targetBatchVolume ?? 0,
      notes: recipe?.notes ?? "",
      ingredients:
        recipe?.ingredients.map((i) => ({
          inventoryItemId: i.inventoryItemId,
          quantity: i.quantity,
          notes: i.notes ?? "",
        })) ?? [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "ingredients",
  });

  async function onSubmit(values: RecipeInput) {
    const res = recipe
      ? await updateRecipe(recipe.id, values)
      : await createRecipe(values);
    if (res.ok) {
      toast.success(recipe ? "Recipe updated" : "Recipe created");
      reset();
      onOpenChange(false);
    } else {
      toast.error(res.error ?? "Failed");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{recipe ? "Edit recipe" : "New recipe"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name" required error={errors.name?.message}>
              <Input {...register("name")} placeholder="Hazy Pale — house" />
            </Field>
            <Field label="Linked product">
              <Select
                value={watch("productId") || "none"}
                onValueChange={(v) => setValue("productId", v === "none" ? "" : v)}
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
          <Field
            label="Target batch volume (L)"
            required
            error={errors.targetBatchVolume?.message}
          >
            <Input
              type="number"
              step="any"
              {...register("targetBatchVolume")}
              placeholder="1000"
            />
          </Field>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Ingredients</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({ inventoryItemId: "", quantity: 0, notes: "" })
                }
              >
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
            {fields.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No ingredients yet.
              </p>
            )}
            <div className="space-y-2">
              {fields.map((f, idx) => {
                const selected = inventoryItems.find(
                  (i) => i.id === watch(`ingredients.${idx}.inventoryItemId`)
                );
                return (
                  <div key={f.id} className="flex items-end gap-2">
                    <div className="flex-1">
                      <Select
                        value={watch(`ingredients.${idx}.inventoryItemId`)}
                        onValueChange={(v) =>
                          setValue(`ingredients.${idx}.inventoryItemId`, v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select ingredient" />
                        </SelectTrigger>
                        <SelectContent>
                          {inventoryItems.map((i) => (
                            <SelectItem key={i.id} value={i.id}>
                              {i.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-28">
                      <Input
                        type="number"
                        step="any"
                        placeholder="Qty"
                        {...register(`ingredients.${idx}.quantity`)}
                      />
                    </div>
                    <span className="w-10 pb-2 text-sm text-muted-foreground">
                      {selected?.unitOfMeasure ?? ""}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(idx)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
            {errors.ingredients && (
              <p className="text-xs font-medium text-destructive">
                Check ingredient rows — each needs an item and a quantity &gt; 0.
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

export function RecipesClient({
  recipes,
  products,
  inventoryItems,
}: {
  recipes: RecipeRow[];
  products: Option[];
  inventoryItems: ItemOption[];
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<RecipeRow | null>(null);

  const columns: ColumnDef<RecipeRow>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      id: "product",
      header: "Product",
      cell: ({ row }) => row.original.product?.name ?? "—",
    },
    {
      accessorKey: "targetBatchVolume",
      header: "Target volume",
      cell: ({ row }) => `${formatNumber(row.original.targetBatchVolume)} L`,
    },
    {
      id: "ingredients",
      header: "Ingredients",
      cell: ({ row }) => row.original.ingredients.length,
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
            title="Delete recipe?"
            description={`Delete "${row.original.name}".`}
            confirmLabel="Delete"
            successMessage="Recipe deleted"
            action={() => deleteRecipe(row.original.id)}
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
        data={recipes}
        searchPlaceholder="Search recipes…"
        toolbar={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New recipe
          </Button>
        }
      />
      <RecipeDialog
        products={products}
        inventoryItems={inventoryItems}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
      {editing && (
        <RecipeDialog
          recipe={editing}
          products={products}
          inventoryItems={inventoryItems}
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
        />
      )}
    </>
  );
}
