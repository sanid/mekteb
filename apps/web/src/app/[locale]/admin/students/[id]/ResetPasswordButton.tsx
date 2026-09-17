"use client";

import { useTransition, useState } from "react";
import { resetStudentPassword } from "./actions";

import { buttonVariants } from "@/components/ui/button";
export function ResetPasswordButton({
  studentId,
  label,
  resultLabel,
}: {
  studentId: string;
  label: string;
  resultLabel: string;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ tempPassword?: string; error?: string } | null>(null);

  function handleClick() {
    startTransition(async () => {
      const res = await resetStudentPassword(studentId);
      if ("ok" in res) {
        setResult({ tempPassword: res.tempPassword });
      } else {
        setResult({ error: res.error });
      }
    });
  }

  if (result?.tempPassword) {
    return (
      <div className="rounded-xl border border-card-border bg-card p-4 space-y-2">
        <div className="text-sm font-medium">{resultLabel}</div>
        <code className="block rounded bg-surface px-3 py-2 font-mono text-sm select-all">
          {result.tempPassword}
        </code>
        <p className="text-xs text-muted">Shown once — copy it now.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {result?.error ? (
        <p className="text-sm text-danger-fg">{result.error}</p>
      ) : null}
      <button
        onClick={handleClick}
        disabled={pending}
        className={buttonVariants({ variant: "destructive" })}
      >
        {pending ? "…" : label}
      </button>
    </div>
  );
}
