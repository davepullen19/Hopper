"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ActionResult } from "@/lib/action-result";

interface ConfirmButtonProps {
  title: string;
  description?: string;
  confirmLabel?: string;
  trigger: React.ReactNode;
  action: () => Promise<ActionResult<unknown>>;
  successMessage?: string;
  variant?: ButtonProps["variant"];
}

export function ConfirmButton({
  title,
  description,
  confirmLabel = "Confirm",
  trigger,
  action,
  successMessage = "Done",
  variant = "destructive",
}: ConfirmButtonProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onConfirm() {
    startTransition(async () => {
      const res = await action();
      if (res.ok) {
        toast.success(successMessage);
        if (res.error) toast.warning(res.error); // partial-success note
        setOpen(false);
      } else {
        toast.error(res.error ?? "Something went wrong");
      }
    });
  }

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant={variant} onClick={onConfirm} disabled={pending}>
              {pending ? "Working…" : confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
