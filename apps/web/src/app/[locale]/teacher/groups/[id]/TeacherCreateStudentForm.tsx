"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { CreatedAccountQr } from "@/components/CreatedAccountQr";

import { inputCls } from "@/components/FormField";
type CreatePersonResult =
  | { ok: true; email: string; full_name: string; tempPassword: string; expires_at: string; username?: string }
  | { ok: false; error: string }
  | null;

export function TeacherCreateStudentForm({
  action,
  baseUrl,
  qrEnabled,
}: {
  action: (prev: CreatePersonResult, formData: FormData) => Promise<CreatePersonResult>;
  /** Origin of this portal (subdomain-aware) — the QR's target host. */
  baseUrl: string;
  /** QR-Selbstanmeldung plugin gate: hide the scan-to-login QR when off. */
  qrEnabled: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations("Admin");
  const tT = useTranslations("Teacher");
  const [state, formAction, pending] = useActionState<CreatePersonResult, FormData>(action, null);

  if (state?.ok) {
    return (
      <div className="space-y-3 rounded-lg border border-accent/40 bg-accent-subtle p-4">
        <p className="text-sm font-medium">{t("studentAccountCreated")}</p>
        <p className="text-sm">{t("shareTempPassword")} {state.full_name} ({state.username ?? state.email}). {t("forcedToChange")}</p>
        <div className="flex flex-wrap items-start gap-5">
          {qrEnabled ? (
            <CreatedAccountQr
              login={state.username ?? state.email}
              password={state.tempPassword}
              baseUrl={baseUrl}
            />
          ) : null}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="rounded-lg border border-card-border bg-card p-3 font-mono text-lg tracking-wide select-all">
              {state.tempPassword}
            </div>
            <p className="text-xs text-muted">{t("validUntil")} {formatDateTime(state.expires_at, locale)}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="text-sm text-accent hover:underline"
        >
          {tT("addAnother")}
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <label className="block space-y-1">
        <span className="text-sm font-medium">{t("fullName")}</span>
        <input
          name="full_name"
          required
          className={inputCls}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium">{t("username")}</span>
        <input
          name="username"
          required
          autoComplete="username"
          placeholder="yusuf_2024"
          pattern="[a-zA-Z0-9_\-]+"
          className={inputCls}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium">{t("dateOfBirthOpt")}</span>
        <input
          type="date"
          name="date_of_birth"
          className={inputCls}
        />
      </label>
      {state && !state.ok ? (
        <p className="text-sm text-danger-fg" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        disabled={pending}
        className={buttonVariants({ size: "xl" })}
      >
        {pending ? t("creating") : tT("addStudent")}
      </button>
    </form>
  );
}
