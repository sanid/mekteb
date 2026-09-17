"use client";

import { Link } from "@/i18n/routing";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { SubmitButton } from "@/components/SubmitButton";
import { FormField, inputCls } from "@/components/FormField";
import { OnboardingResultCard } from "@/components/OnboardingResultCard";
import { createParentAccount, type OnboardingResult } from "../../onboarding";

export default function NewParentForm({ qrEnabled }: { qrEnabled: boolean }) {
  const t = useTranslations("Admin");
  const [state, formAction] = useActionState<OnboardingResult | null, FormData>(
    createParentAccount,
    null,
  );

  if (state?.ok) {
    return (
      <OnboardingResultCard
        state={state}
        titleKey="parentAccountCreated"
        backHref="/admin/parents"
        backLabel={t("backToParents")}
        qrEnabled={qrEnabled}
      />
    );
  }

  return (
    <div className="max-w-lg">
      <div className="rounded-xl border border-card-border bg-card overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-accent/60 to-accent/20" />
        <div className="p-6 sm:p-8">
          <p className="text-sm text-muted mb-6 leading-relaxed">
            {t("addingParentTriggers")}
          </p>

          <form action={formAction} className="space-y-5">
            <FormField label={t("fullName")} required>
              <input
                name="full_name"
                required
                autoComplete="name"
                placeholder={t("fullNamePlaceholder")}
                className={inputCls}
              />
            </FormField>

            <FormField label={t("email")} required>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder="name@beispiel.de"
                className={inputCls}
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FormField label={t("phone")}>
                <input
                  type="tel"
                  name="phone"
                  autoComplete="tel"
                  placeholder="+49 …"
                  className={inputCls}
                />
              </FormField>
              <FormField
                label={t("relation")}
                hint={t("relationHint")}
              >
                <input
                  name="relation"
                  placeholder={t("relationPlaceholder")}
                  className={inputCls}
                />
              </FormField>
            </div>

            {state && !state.ok && (
              <div className="rounded-xl bg-danger-subtle border border-danger/30 px-4 py-3">
                <p className="text-sm text-danger-fg" role="alert">
                  {state.error}
                </p>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <SubmitButton pendingText={t("creating")}>
                {t("addParent")}
              </SubmitButton>
              <Link
                href="/admin/parents"
                className="text-sm text-muted hover:text-foreground transition-colors"
              >
                {t("cancel")}
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
