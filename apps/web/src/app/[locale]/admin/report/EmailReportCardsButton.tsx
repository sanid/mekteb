"use client";

import { useState, useTransition } from "react";
import { Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { emailReportCardsAction } from "./actions";

import { buttonVariants } from "@/components/ui/button";
export function EmailReportCardsButton({
  labels,
}: {
  labels: { send: string; sending: string; done: string; emailed: string; skipped: string };
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ emailed: number; skipped: number; failed: number } | null>(null);

  function run() {
    startTransition(async () => {
      const res = await emailReportCardsAction(false);
      if ("error" in res) {
        toast.error(res.error);
      } else {
        setResult({ emailed: res.emailed, skipped: res.skipped, failed: res.failed });
        toast.success(`${labels.done}: ${res.emailed} ${labels.emailed}`);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className={buttonVariants({ variant: "outline" })}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
        {pending ? labels.sending : labels.send}
      </button>
      {result && (
        <p className="text-xs text-muted">
          {result.emailed} {labels.emailed} · {result.skipped} {labels.skipped}
        </p>
      )}
    </div>
  );
}
