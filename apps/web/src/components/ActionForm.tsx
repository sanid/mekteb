"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

export type ActionResult = { error: string } | { ok: true } | null | undefined;

export function ActionForm({
  action,
  successMessage,
  resetOnSuccess = true,
  children,
  className,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  successMessage: string;
  resetOnSuccess?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [result, formAction] = useActionState(
    (_: ActionResult, formData: FormData) => action(formData),
    null,
  );

  useEffect(() => {
    if (!result) return;
    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.success(successMessage);
      if (resetOnSuccess) formRef.current?.reset();
    }
  }, [result, successMessage, resetOnSuccess]);

  return (
    <form ref={formRef} action={formAction} className={className}>
      {children}
    </form>
  );
}
