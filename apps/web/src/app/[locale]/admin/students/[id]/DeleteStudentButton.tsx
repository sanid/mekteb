"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "@/i18n/routing";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { deleteStudent } from "./actions";

export function DeleteStudentButton({
  studentId,
  deleteLabel,
  confirmDelete,
  cancelLabel,
  studentsPath,
}: {
  studentId: string;
  deleteLabel: string;
  confirmDelete: string;
  cancelLabel: string;
  studentsPath: string;
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
            const result = await deleteStudent(studentId);
            if ("ok" in result) router.push(studentsPath);
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
