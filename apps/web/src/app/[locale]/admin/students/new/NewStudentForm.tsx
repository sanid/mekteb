"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { SubmitButton } from "@/components/SubmitButton";
import { FormField, inputCls } from "@/components/FormField";
import { OnboardingResultCard } from "@/components/OnboardingResultCard";
import { Link } from "@/i18n/routing";
import { createStudentAccount, type OnboardingResult } from "../../onboarding";

export default function NewStudentForm({ qrEnabled }: { qrEnabled: boolean }) {
  const t = useTranslations("Admin");
  const [state, formAction] = useActionState<OnboardingResult | null, FormData>(
    createStudentAccount,
    null,
  );

  if (state?.ok) {
    return (
      <OnboardingResultCard
        state={{ ...state, email: state.username ?? state.email }}
        titleKey="studentAccountCreated"
        backHref="/admin/students"
        backLabel={t("backToStudents")}
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
            {t("addStudentLoginDesc")}
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

            <FormField label={t("username")} required hint={t("usernameHint")}>
              <input
                name="username"
                required
                autoComplete="username"
                placeholder="yusuf_2024"
                pattern="[a-zA-Z0-9_\-]+"
                className={inputCls}
              />
            </FormField>

            <FormField label={t("dateOfBirthOpt")}>
              <input
                type="date"
                name="date_of_birth"
                className={inputCls}
              />
            </FormField>

            {state && !state.ok && (
              <div className="rounded-xl bg-danger-subtle border border-danger/30 px-4 py-3">
                <p className="text-sm text-danger-fg" role="alert">
                  {state.error}
                </p>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <SubmitButton pendingText={t("creating")}>
                {t("addStudentWithLogin")}
              </SubmitButton>
              <Link
                href="/admin/students"
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
