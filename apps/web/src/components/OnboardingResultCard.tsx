"use client";

import { QRCodeSVG } from "qrcode.react";
import { useLocale, useTranslations } from "next-intl";

import { Link } from "@/i18n/routing";
import { buttonVariants } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { loginQrUrl } from "@/lib/login-qr";

type OnboardingSuccess = {
  ok: true;
  email: string;
  full_name: string;
  tempPassword: string;
  expires_at: string;
  /** Students log in with a mosque-qualified username, not their email. */
  username?: string;
};

export function OnboardingResultCard({
  state,
  titleKey,
  backHref,
  backLabel,
  qrEnabled,
}: {
  state: OnboardingSuccess;
  titleKey: string;
  backHref: string;
  backLabel: string;
  /** QR-Selbstanmeldung plugin gate: hide the scan-to-login QR when off. */
  qrEnabled: boolean;
}) {
  const t = useTranslations("Admin");
  const locale = useLocale();

  const loginUrl = loginQrUrl({
    baseUrl: window.location.origin,
    locale,
    login: state.username ?? state.email,
    password: state.tempPassword,
  });

  return (
    <div className="max-w-xl space-y-4 rounded-xl border border-accent/40 bg-accent-subtle p-6">
      <h1 className="text-xl font-semibold">{t(titleKey)}</h1>
      <p className="text-sm">
        {t("shareTempPassword")} {state.full_name} ({state.email}).
        {t("forcedToChange")}
      </p>

      <div className="flex flex-col sm:flex-row items-start gap-5">
        {qrEnabled ? (
          <div className="rounded-xl border border-card-border bg-white p-3">
            <QRCodeSVG value={loginUrl} size={160} level="M" />
          </div>
        ) : null}
        <div className="space-y-2 flex-1">
          <p className="text-xs font-medium text-muted">{t("scanToLogin")}</p>
          <div className="rounded-lg border border-card-border bg-card p-3 font-mono text-lg tracking-wide select-all">
            {state.tempPassword}
          </div>
          <p className="text-xs text-muted">
            {t("validUntil")} {formatDateTime(state.expires_at, locale)}. {t("passwordShownOnce")}
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <Link
          href={backHref}
          className={buttonVariants({ size: "xl" })}
        >
          {backLabel}
        </Link>
        <Link
          href={`${backHref}/new`}
          className={buttonVariants({ variant: "outline", size: "xl" })}
        >
          {t("addAnother")}
        </Link>
      </div>
    </div>
  );
}
