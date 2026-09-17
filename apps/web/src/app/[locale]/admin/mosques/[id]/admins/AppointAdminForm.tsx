"use client";

import { useActionState, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { appointAdmin, createAndAppointAdmin } from "../../actions";
import { FormField, inputCls } from "@/components/FormField";
import { buttonVariants } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";

/**
 * Appointing an admin only works on someone who already has an account. When
 * the lookup misses we no longer dead-end on "no account was found" — the
 * form asks for a name and creates the account in the same step, handing back
 * the temporary password once, exactly as the teacher/parent flow does.
 */
export function AppointAdminForm({ mosqueId }: { mosqueId: string }) {
  const t = useTranslations("Admin");
  const locale = useLocale();

  const [appointState, appointFormAction] = useActionState(
    async (_prev: unknown, formData: FormData) => {
      const email = String(formData.get("email") ?? "").trim().toLowerCase();
      const result = await appointAdmin(formData);
      return result && "error" in result ? { ...result, email } : result;
    },
    null,
  );

  const [createState, createFormAction] = useActionState(createAndAppointAdmin, null);

  // Which "no account" result the admin backed out of. Derived rather than
  // synced in an effect, so dismissing needs no cascading render — and a fresh
  // submission yields a new object, which reopens step two on its own.
  const [dismissed, setDismissed] = useState<unknown>(null);
  const missingAccountFor =
    appointState &&
    "error" in appointState &&
    appointState.code === "no_account_for_email" &&
    appointState !== dismissed
      ? (appointState.email ?? null)
      : null;

  // Effects here only fire toasts — no state writes.
  useEffect(() => {
    if (!appointState) return;
    if (!("error" in appointState)) {
      toast.success(t("adminAppointed"));
    } else if (appointState.code !== "no_account_for_email") {
      toast.error(appointState.error);
    }
  }, [appointState, t]);

  useEffect(() => {
    if (createState && "error" in createState) toast.error(createState.error);
  }, [createState]);

  // Created: show the temporary password once, then stop rendering the form.
  if (createState && "ok" in createState) {
    return (
      <div className="space-y-4 rounded-xl border border-accent/40 bg-accent-subtle p-5">
        <h3 className="font-semibold">{t("adminAccountCreated")}</h3>
        <p className="text-sm">
          {t("shareTempPassword")} {createState.full_name} ({createState.email}).
          {t("forcedToChange")}
        </p>
        <div className="rounded-lg border border-card-border bg-card p-3 font-mono text-lg tracking-wide select-all">
          {createState.tempPassword}
        </div>
        <p className="text-xs text-muted">
          {t("validUntil")} {formatDateTime(createState.expires_at, locale)}. {t("passwordShownOnce")}
        </p>
      </div>
    );
  }

  // Step two — the address had no account, so collect a name and create it.
  if (missingAccountFor) {
    return (
      <form action={createFormAction} className="space-y-4">
        <input type="hidden" name="mosque_id" value={mosqueId} />
        <input type="hidden" name="email" value={missingAccountFor} />
        <div className="rounded-lg border border-card-border bg-surface p-3 text-sm">
          <p className="font-medium">{t("noAccountCreateOne", { email: missingAccountFor })}</p>
          <p className="mt-1 text-xs text-muted">{t("noAccountCreateOneHint")}</p>
        </div>
        <FormField label={t("fullName")} required>
          <input name="full_name" required autoFocus className={inputCls} />
        </FormField>
        <div className="flex flex-wrap gap-2">
          <button type="submit" className={buttonVariants({ size: "xl" })}>
            {t("createAndAppointAdmin")}
          </button>
          <button
            type="button"
            onClick={() => setDismissed(appointState)}
            className={buttonVariants({ variant: "outline", size: "xl" })}
          >
            {t("cancel")}
          </button>
        </div>
      </form>
    );
  }

  // Step one — appoint an existing account by email.
  return (
    <form action={appointFormAction} className="space-y-4">
      <input type="hidden" name="mosque_id" value={mosqueId} />
      <FormField label="Email" required>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="admin@mosque.org"
          className={inputCls}
        />
      </FormField>
      <button type="submit" className={buttonVariants({ size: "xl" })}>
        {t("appointAdmin")}
      </button>
    </form>
  );
}
