"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Play,
  FlaskConical,
  MoveRight,
  Gauge,
  PackageCheck,
  StickyNote,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/form-field";
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
import { humanize } from "@/lib/utils";
import type { ActionResult } from "@/lib/action-result";
import {
  startBatch,
  consumeIngredients,
  changeBatchStatus,
  recordYield,
  packageBatch,
  addBatchNote,
} from "@/app/actions/batches";

type ProductOption = { id: string; name: string; unitSize: string };
type ItemOption = { id: string; name: string; unitOfMeasure: string };

const STATUSES = [
  "PLANNED",
  "BREWED",
  "FERMENTING",
  "CONDITIONING",
  "PACKAGED",
  "COMPLETE",
  "DUMPED",
] as const;

export function BatchActions({
  batchId,
  status,
  hasRecipe,
  defaultProductId,
  products,
  packagingItems,
}: {
  batchId: string;
  status: string;
  hasRecipe: boolean;
  defaultProductId: string | null;
  plannedVolume: number;
  products: ProductOption[];
  packagingItems: ItemOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // dialog open state
  const [statusOpen, setStatusOpen] = useState(false);
  const [yieldOpen, setYieldOpen] = useState(false);
  const [packageOpen, setPackageOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);

  // form fields
  const [newStatus, setNewStatus] = useState(status);
  const [statusNote, setStatusNote] = useState("");
  const [actualVolume, setActualVolume] = useState("");
  const [pkgProduct, setPkgProduct] = useState(defaultProductId ?? "");
  const [pkgUnits, setPkgUnits] = useState("");
  const [pkgItem, setPkgItem] = useState("");
  const [pkgPerUnit, setPkgPerUnit] = useState("1");
  const [note, setNote] = useState("");

  function run(fn: () => Promise<ActionResult<unknown>>, success: string, onDone?: () => void) {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        toast.success(success);
        if (res.error) toast.warning(res.error);
        onDone?.();
        router.refresh();
      } else {
        toast.error(res.error ?? "Failed");
      }
    });
  }

  const terminal = status === "COMPLETE" || status === "DUMPED";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {status === "PLANNED" && (
          <Button
            disabled={pending}
            onClick={() => run(() => startBatch(batchId), "Batch started")}
          >
            <Play className="h-4 w-4" /> Start batch (brew)
          </Button>
        )}

        <Button
          variant="outline"
          disabled={pending || !hasRecipe}
          title={hasRecipe ? "" : "Link a recipe first"}
          onClick={() =>
            run(() => consumeIngredients(batchId), "Ingredients consumed")
          }
        >
          <FlaskConical className="h-4 w-4" /> Consume ingredients
        </Button>

        <Button
          variant="outline"
          disabled={pending}
          onClick={() => setStatusOpen(true)}
        >
          <MoveRight className="h-4 w-4" /> Change status
        </Button>

        <Button
          variant="outline"
          disabled={pending}
          onClick={() => setYieldOpen(true)}
        >
          <Gauge className="h-4 w-4" /> Record actual yield
        </Button>

        <Button
          variant="outline"
          disabled={pending || terminal}
          onClick={() => setPackageOpen(true)}
        >
          <PackageCheck className="h-4 w-4" /> Package into finished goods
        </Button>

        <Button
          variant="ghost"
          disabled={pending}
          onClick={() => setNoteOpen(true)}
        >
          <StickyNote className="h-4 w-4" /> Add note
        </Button>
      </CardContent>

      {/* Change status */}
      <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="New status">
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {humanize(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Note (optional)">
              <Textarea
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                rows={2}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                run(
                  () =>
                    changeBatchStatus({
                      batchId,
                      status: newStatus,
                      notes: statusNote,
                    }),
                  "Status updated",
                  () => setStatusOpen(false)
                )
              }
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record yield */}
      <Dialog open={yieldOpen} onOpenChange={setYieldOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record actual yield</DialogTitle>
          </DialogHeader>
          <Field label="Actual volume (L)" required>
            <Input
              type="number"
              step="any"
              value={actualVolume}
              onChange={(e) => setActualVolume(e.target.value)}
            />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setYieldOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                run(
                  () =>
                    recordYield({
                      batchId,
                      actualVolume: Number(actualVolume),
                    }),
                  "Yield recorded",
                  () => setYieldOpen(false)
                )
              }
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Package */}
      <Dialog open={packageOpen} onOpenChange={setPackageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Package into finished goods</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="Finished-goods product" required>
              <Select value={pkgProduct} onValueChange={setPkgProduct}>
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
            </Field>
            <Field label="Units produced" required>
              <Input
                type="number"
                value={pkgUnits}
                onChange={(e) => setPkgUnits(e.target.value)}
                placeholder="480"
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Packaging material (optional)">
                <Select
                  value={pkgItem || "none"}
                  onValueChange={(v) => setPkgItem(v === "none" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {packagingItems.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Packaging per unit">
                <Input
                  type="number"
                  step="any"
                  value={pkgPerUnit}
                  onChange={(e) => setPkgPerUnit(e.target.value)}
                />
              </Field>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPackageOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                run(
                  () =>
                    packageBatch({
                      batchId,
                      productId: pkgProduct,
                      units: Number(pkgUnits),
                      packagingItemId: pkgItem || undefined,
                      packagingPerUnit: Number(pkgPerUnit || 1),
                    }),
                  "Batch packaged",
                  () => setPackageOpen(false)
                )
              }
            >
              Package
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add note */}
      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add note</DialogTitle>
          </DialogHeader>
          <Field label="Note" required>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                run(
                  () => addBatchNote({ batchId, notes: note }),
                  "Note added",
                  () => {
                    setNote("");
                    setNoteOpen(false);
                  }
                )
              }
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
