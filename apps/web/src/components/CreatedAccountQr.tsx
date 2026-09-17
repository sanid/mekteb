"use client";

import { QRCodeSVG } from "qrcode.react";
import { useLocale, useTranslations } from "next-intl";

import { loginQrUrl } from "@/lib/login-qr";

/**
 * The QR a newly created account's credentials are handed over with.
 *
 * Compact enough to sit inside the small create-person result boxes on the
 * teacher group page; the admin onboarding card uses the same URL through
 * `loginQrUrl` so every QR behaves identically (web login pre-filled + the
 * "open in app" step on the login page).
 */
export function CreatedAccountQr({
  login,
  password,
  baseUrl,
  size = 132,
}: {
  /** Email for parents/teachers, username for students. */
  login: string;
  password: string;
  baseUrl: string;
  size?: number;
}) {
  const locale = useLocale();
  const t = useTranslations("Admin");
  const url = loginQrUrl({ baseUrl, locale, login, password });

  return (
    <div className="flex items-center gap-4">
      <div className="shrink-0 rounded-xl border border-card-border bg-white p-2.5">
        <QRCodeSVG value={url} size={size} level="M" />
      </div>
      <p className="text-xs text-muted">{t("scanToLogin")}</p>
    </div>
  );
}
