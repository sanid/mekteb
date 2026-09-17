"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "@/i18n/routing";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { deleteParent } from "./actions";

export function ParentActions({
  parentId,
  deleteLabel,
  confirmDelete,
  cancelLabel,
  parentsPath,
}: {
  parentId: string;
  deleteLabel: string;
  confirmDelete: string;
  cancelLabel: string;
  parentsPath: string;
}) {
  const router = useRouter();
  const [pending, startDelete] = useTransition();

  return (
    <ConfirmDialog
      title={deleteLabel}
      description={confirmDelete}
      confirmLabel={deleteLabel}
      cancelLabel={cancelLabel}
      variant="destructive"
      onConfirm={() =>
        new Promise<void>((resolve) =>
          startDelete(async () => {
            const result = await deleteParent(parentId);
            if ("ok" in result) router.push(parentsPath);
            resolve();
          }),
        )
      }
      trigger={
        <Button variant="destructive" size="sm" disabled={pending}>
          <Trash2 className="h-4 w-4" />
          {pending ? "…" : deleteLabel}
        </Button>
      }
    />
  );
}
