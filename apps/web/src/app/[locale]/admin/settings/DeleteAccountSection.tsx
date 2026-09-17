"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { deleteOwnMosque } from "./actions";
import { buttonVariants } from "@/components/ui/button";

export function DeleteAccountSection({ mosqueName }: { mosqueName: string }) {
  const t = useTranslations("Admin");
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [, startTransition] = useTransition();
  const matches = confirmation === mosqueName;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-danger/30 px-4 py-2 text-sm font-medium text-danger-fg hover:bg-danger-subtle transition-colors"
      >
        {t("deleteAccount")}
      </button>
    );
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteOwnMosque(confirmation);
      if (result && "error" in result) {
        toast.error(result.error);
      }
      // on success the server action redirects to /login — no client handling needed
    });
  }

  return (
    <div className="rounded-xl border border-danger/30 bg-danger-subtle p-5 space-y-3">
      <p className="text-sm font-semibold text-danger-fg">
        {t("deleteAccountTitle")}
      </p>
      <p className="text-xs text-danger-fg">
        {t("deleteAccountWarning")}
      </p>
      <p className="text-xs text-danger-fg">
        {t("deleteAccountTypeToConfirm", { name: mosqueName })}
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
          className={buttonVariants({ variant: "danger" })}
        >
          {t("deleteAccountConfirm")}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setConfirmation(""); }}
          className={buttonVariants({ variant: "outline", size: "xl" })}
        >
          {t("cancel")}
        </button>
      </div>
    </div>
  );
}
