"use client";

import { useState, useTransition } from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, X } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
type Labels = {
  title: string;
  open: string;
  close: string;
  hint: string;
  scanHint: string;
  linkLabel: string;
};

export function CheckinPanel({
  groupId,
  date,
  locale,
  baseUrl,
  initialActive,
  initialToken,
  openAction,
  closeAction,
  labels,
}: {
  groupId: string;
  date: string;
  locale: string;
  baseUrl: string;
  initialActive: boolean;
  initialToken: string | null;
  openAction: (groupId: string, date: string) => Promise<{ error: string } | { ok: true; token: string }>;
  closeAction: (groupId: string, date: string) => Promise<{ error: string } | { ok: true }>;
  labels: Labels;
}) {
  const [pending, startTransition] = useTransition();
  const [active, setActive] = useState(initialActive);
  const [token, setToken] = useState(initialToken);

  const url = token ? `${baseUrl}/${locale}/checkin/${token}` : "";

  function open() {
    startTransition(async () => {
      const res = await openAction(groupId, date);
      if ("error" in res) {
        toast.error(res.error);
      } else {
        setToken(res.token);
        setActive(true);
      }
    });
  }

  function close() {
    startTransition(async () => {
      const res = await closeAction(groupId, date);
      if ("error" in res) toast.error(res.error);
      else setActive(false);
    });
  }

  return (
    <div className="rounded-xl border border-card-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex min-w-0 items-center gap-2 text-base font-semibold leading-tight tracking-tight">
          <QrCode className="h-4 w-4 shrink-0 text-accent" />
          {labels.title}
        </h3>
        {active ? (
          <button
            type="button"
            onClick={close}
            disabled={pending}
            className={cn(buttonVariants({ variant: "destructive", size: "sm" }), "shrink-0")}
          >
            <X className="h-3.5 w-3.5" /> {labels.close}
          </button>
        ) : (
          <button
            type="button"
            onClick={open}
            disabled={pending}
            className={cn(buttonVariants({ size: "sm" }), "shrink-0")}
          >
            {labels.open}
          </button>
        )}
      </div>

      {active && url ? (
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="rounded-xl bg-white p-3">
            <QRCodeSVG value={url} size={180} level="M" />
          </div>
          <p className="text-xs text-muted text-center max-w-xs">{labels.scanHint}</p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-accent hover:underline break-all text-center"
          >
            {labels.linkLabel}
          </a>
        </div>
      ) : (
        <p className="text-xs text-muted">{labels.hint}</p>
      )}
    </div>
  );
}
