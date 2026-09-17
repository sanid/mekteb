"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { cancelSubscription, reactivateSubscription } from "./actions";
import { formatDateShort } from "@/lib/format";

export function CancelButton({ cancelsAt, downgradeToFree }: { cancelsAt: string | null; downgradeToFree: boolean }) {
  const locale = useLocale();
  const t = useTranslations("Billing");
  const [, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const isPendingCancel = cancelsAt !== null;

  if (isPendingCancel) {
    return (
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-muted">
          {downgradeToFree
            ? t("downgradesToFreeOn", { date: formatDateShort(cancelsAt, locale) })
            : t("cancelsOn", { date: formatDateShort(cancelsAt, locale) })}
        </span>
        <button
          type="button"
          onClick={() =>
            startTransition(async () => {
              const r = await reactivateSubscription();
              if ("error" in r) toast.error(r.error);
              else toast.success(t("reactivated"));
            })
          }
          className="text-xs text-accent hover:underline font-medium"
        >
          {t("reactivate")}
        </button>
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-muted">{t("cancelConfirm")}</span>
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            startTransition(async () => {
              const r = await cancelSubscription();
              if ("error" in r) toast.error(r.error);
              else toast.success(t("cancelScheduled"));
            });
          }}
          className="text-xs text-danger-fg hover:underline font-medium"
        >
          {t("confirmCancel")}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="text-xs text-muted hover:text-foreground"
        >
          {t("keepPlan")}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-medium text-danger-fg hover:bg-danger-subtle transition-colors"
    >
      {t("cancelSubscription")}
    </button>
  );
}
