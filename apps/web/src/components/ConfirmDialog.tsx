"use client";

import * as React from "react";
import { useState, useTransition, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Variant = "default" | "destructive";

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
}: {
  trigger: ReactNode;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: Variant;
  onConfirm: () => Promise<unknown> | void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      await onConfirm();
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            {variant === "destructive" && (
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-danger-subtle">
                <AlertTriangle className="h-5 w-5 text-danger-fg" />
              </div>
            )}
            <div className="flex-1 space-y-1.5">
              <DialogTitle>{title}</DialogTitle>
              {description && <DialogDescription>{description}</DialogDescription>}
            </div>
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant === "destructive" ? "danger" : "default"}
            onClick={handleConfirm}
            disabled={pending}
          >
            {pending ? "…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Promise-based replacement for `window.confirm`, rendered with the app's
 * dialog instead of the browser popup:
 *
 *   const [confirm, confirmDialog] = useConfirm();
 *   if (!(await confirm({ title: t("confirmDelete") }))) return;
 *   …
 *   return <>{confirmDialog}…</>;
 */
export function useConfirm(): [
  (opts: { title: string; description?: string; confirmLabel?: string; cancelLabel?: string; destructive?: boolean }) => Promise<boolean>,
  React.ReactNode,
] {
  const [state, setState] = useState<{
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
    resolve: (ok: boolean) => void;
  } | null>(null);
  const tAdmin = useTranslations("Admin");

  const confirm = React.useCallback(
    (opts: { title: string; description?: string; confirmLabel?: string; cancelLabel?: string; destructive?: boolean }) =>
      new Promise<boolean>((resolve) => setState({ destructive: true, ...opts, resolve })),
    [],
  );

  const close = (ok: boolean) => {
    state?.resolve(ok);
    setState(null);
  };

  const node = (
    <Dialog open={state !== null} onOpenChange={(open) => { if (!open) close(false); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            {state?.destructive && (
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-danger-subtle">
                <AlertTriangle className="h-5 w-5 text-danger-fg" />
              </div>
            )}
            <div className="flex-1 space-y-1.5">
              <DialogTitle>{state?.title}</DialogTitle>
              {state?.description && <DialogDescription>{state.description}</DialogDescription>}
            </div>
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => close(false)}>
            {state?.cancelLabel ?? tAdmin("cancel")}
          </Button>
          <Button type="button" variant={state?.destructive ? "danger" : "default"} onClick={() => close(true)}>
            {state?.confirmLabel ?? (state?.destructive ? tAdmin("delete") : "OK")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return [confirm, node];
}
