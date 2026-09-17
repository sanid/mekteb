"use client";

import { useEffect, useRef } from "react";
import { useActionState } from "react";
import { toast } from "sonner";
import { Languages } from "lucide-react";

import { useTranslations } from "next-intl";
import { SubmitButton } from "@/components/SubmitButton";
import { FormField, inputCls } from "@/components/FormField";
import { updateTopic } from "./topic-actions";

const ALL_LOCALES = [
  { code: "de", label: "Deutsch" },
  { code: "en", label: "English" },
  { code: "bs", label: "Bosanski" },
  { code: "tr", label: "Türkçe" },
];

export type TopicTranslationInput = {
  title: string;
  description: string;
};

/**
 * Rename a topic, edit its description and maintain its per-locale
 * translations. The base title/description is the fallback for any locale
 * without a translation; a locale row left blank removes the override.
 */
export default function TopicEditForm({
  topicId,
  initialTitle,
  initialDescription,
  initialTranslations,
}: {
  topicId: string;
  initialTitle: string;
  initialDescription: string | null;
  initialTranslations: Record<string, TopicTranslationInput>;
}) {
  const t = useTranslations("Admin");
  const formRef = useRef<HTMLFormElement>(null);
  const [result, formAction] = useActionState(
    (_: unknown, formData: FormData) => updateTopic(formData),
    null,
  );

  useEffect(() => {
    if (!result) return;
    if (typeof result === "object" && "error" in result) {
      toast.error((result as { error: string }).error);
    } else {
      toast.success(t("topicSaved"));
    }
  }, [result, t]);

  return (
    <form ref={formRef} action={formAction} className="space-y-5">
      <input type="hidden" name="topic_id" value={topicId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t("topicTitle")} required>
          <input
            name="title"
            required
            defaultValue={initialTitle}
            placeholder={t("topicTitlePlaceholder")}
            className={inputCls}
          />
        </FormField>
        <FormField label={t("descriptionOpt")}>
          <input
            name="description"
            defaultValue={initialDescription ?? ""}
            placeholder={t("descriptionPlaceholder")}
            className={inputCls}
          />
        </FormField>
      </div>

      <div className="rounded-xl border border-card-border bg-card p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Languages className="h-4 w-4 text-accent" />
          {t("topicTranslations")}
        </div>
        <p className="text-xs text-muted -mt-2">{t("topicTranslationsHint")}</p>

        <div className="grid gap-4 sm:grid-cols-2">
          {ALL_LOCALES.map((locale) => {
            const existing = initialTranslations[locale.code];
            return (
              <div
                key={locale.code}
                className="rounded-lg border border-card-border p-3 space-y-3"
              >
                <p className="text-xs font-semibold text-muted">{locale.label}</p>
                <input
                  name={`translation_${locale.code}_title`}
                  defaultValue={existing?.title ?? ""}
                  placeholder={t("topicTitle")}
                  className={inputCls}
                />
                <input
                  name={`translation_${locale.code}_description`}
                  defaultValue={existing?.description ?? ""}
                  placeholder={t("descriptionOpt")}
                  className={inputCls}
                />
              </div>
            );
          })}
        </div>
      </div>

      <SubmitButton pendingText={t("saving")}>{t("save")}</SubmitButton>
    </form>
  );
}
