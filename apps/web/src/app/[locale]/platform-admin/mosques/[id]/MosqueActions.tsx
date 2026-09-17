"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { setSubscriptionStatus, deleteMosque } from "./actions";
import { buttonVariants } from "@/components/ui/button";

type Status = "active" | "trialing" | "suspended" | "canceled";

export function SubscriptionActions({
  mosqueId,
  currentStatus,
}: {
  mosqueId: string;
  currentStatus: string;
}) {
  const t = useTranslations("PlatformAdmin");
  const [, startTransition] = useTransition();

  const actions: { status: Status; labelKey: Parameters<typeof t>[0]; className: string }[] = [
    { status: "active",    labelKey: "activate",           className: "border-success text-success-fg hover:bg-success-subtle" },
    { status: "suspended", labelKey: "suspend",            className: "border-warning text-warning-fg hover:bg-warning-subtle" },
    { status: "canceled",  labelKey: "cancelSubscription", className: "border-danger text-danger-fg hover:bg-danger-subtle" },
    { status: "trialing",  labelKey: "restoreTrial",       className: "border-info text-info-fg hover:bg-info-subtle" },
  ];

  function handle(status: Status) {
    startTransition(async () => {
      const result = await setSubscriptionStatus(mosqueId, status);
      if (result && "error" in result) {
        toast.error(result.error);
      } else {
        toast.success(t("statusUpdated"));
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {actions.filter((a) => a.status !== currentStatus).map((a) => (
        <button
          key={a.status}
          type="button"
          onClick={() => handle(a.status)}
          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${a.className}`}
        >
          {t(a.labelKey)}
        </button>
      ))}
    </div>
  );
}

export function DeleteMosqueSection({
  mosqueId,
  mosqueName,
}: {
  mosqueId: string;
  mosqueName: string;
}) {
  const t = useTranslations("PlatformAdmin");
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [, startTransition] = useTransition();
  const matches = confirmation === mosqueName;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-semibold text-danger-fg hover:bg-danger-subtle transition-colors"
      >
        {t("deleteMosqueTitle")}…
      </button>
    );
  }

  function handleDelete() {
    const fd = new FormData();
    fd.set("mosque_id", mosqueId);
    fd.set("mosque_name", mosqueName);
    fd.set("confirmation", confirmation);
    startTransition(async () => { await deleteMosque(fd); });
  }

  return (
    <div className="rounded-xl border border-danger/30 bg-danger-subtle p-4 space-y-3">
      <p className="text-sm font-semibold text-danger-fg">
        {t("deleteMosqueTitle")}
      </p>
      <p className="text-xs text-danger-fg">
        {t("deleteMosqueWarning")}{" "}
        <strong>{t("deleteMosqueCannotUndo")}</strong>
      </p>
      <p className="text-xs text-danger-fg">
        {t.rich("deleteMosqueTypeToConfirm", {
          name: mosqueName,
          strong: (chunks) => <strong>{chunks}</strong>,
        })}
      </p>
      <input
        value={confirmation}
        onChange={(e) => setConfirmation(e.target.value)}
        placeholder={mosqueName}
        className="block w-full rounded-lg border border-danger/30 bg-background px-3 py-2 text-sm focus:border-danger focus:outline-none"
      />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!matches}
          onClick={handleDelete}
          className={buttonVariants({ variant: "danger", size: "sm" })}
        >
          {t("deletePermanently")}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setConfirmation(""); }}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          {t("cancelAction")}
        </button>
      </div>
    </div>
  );
}
