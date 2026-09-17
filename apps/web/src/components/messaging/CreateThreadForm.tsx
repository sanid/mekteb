"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect } from "react";
import { SubmitButton } from "@/components/SubmitButton";

import {
  createThread,
  type CreateThreadResult,
} from "@/lib/messaging-actions";

import { inputCls } from "@/components/FormField";
import { cn } from "@/lib/utils";
type Recipient = { id: string; name: string; role: string };

type Props = {
  recipients: Recipient[];
  rolePrefix: "admin" | "teacher" | "parent";
};

export function CreateThreadForm({ recipients, rolePrefix }: Props) {
  const t = useTranslations("Messaging");
  const locale = useLocale();
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    CreateThreadResult | null,
    FormData
  >(createThread, null);

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      router.push(`/${locale}/${rolePrefix}/messages/${state.threadId}`);
    }
  }, [state, router, locale, rolePrefix]);

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-xl border border-card-border bg-card p-5"
    >
      <h2 className="font-semibold text-sm">{t("newThread")}</h2>

      <label className="block">
        <span className="text-xs font-medium text-muted">{t("subjectOpt")}</span>
        <input
          name="subject"
          className={cn(inputCls, "mt-1")}
        />
      </label>

      <label className="block">
        <span className="text-xs font-medium text-muted">{t("to")}</span>
        <select
          name="recipient_ids"
          multiple
          required
          size={Math.min(recipients.length, 5)}
          className={cn(inputCls, "mt-1")}
        >
          {recipients.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} ({r.role})
            </option>
          ))}
        </select>
        <span className="text-xs text-muted">{t("multiSelectHint")}</span>
      </label>

      <label className="block">
        <span className="text-xs font-medium text-muted">{t("message")}</span>
        <textarea
          name="body"
          required
          rows={3}
          className={cn(inputCls, "mt-1")}
        />
      </label>

      {state && "error" in state ? (
        <p className="text-sm text-danger-fg" role="alert">
          {state.error}
        </p>
      ) : null}

      <SubmitButton
        disabled={recipients.length === 0}
        pendingText={t("sending")}
      >
        {t("send")}
      </SubmitButton>
    </form>
  );
}
