"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import type { Factor } from "@supabase/supabase-js";

import GdprSection from "@/components/GdprSection";
import { NotificationPreferences } from "@/components/NotificationPreferences";
import ProfileSection from "@/components/ProfileSection";
import { buttonVariants } from "@/components/ui/button";
import { formatDateShort } from "@/lib/format";

import { useConfirm } from "@/components/ConfirmDialog";
type EnrollState =
  | { step: "idle" }
  | { step: "scanning"; factorId: string; qrCode: string; secret: string }
  | { step: "verifying"; factorId: string };

export default function AccountSettings() {
  const locale = useLocale();
  const t = useTranslations("Account");
  const [confirm, confirmDialog] = useConfirm();
  const supabase = createClient();

  const [factors, setFactors] = useState<Factor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);
  const [enrollState, setEnrollState] = useState<EnrollState>({ step: "idle" });
  const [totpCode, setTotpCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.mfa.listFactors().then(({ data }) => {
      if (!cancelled) {
        setFactors(data?.totp ?? []);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTick]);

  function reloadFactors() {
    setRefreshTick((n) => n + 1);
  }

  async function startEnroll() {
    setSubmitting(true);
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      issuer: "Mekteb",
    });
    setSubmitting(false);
    if (error || !data) {
      toast.error(t("mfaEnrollError"));
      return;
    }
    setEnrollState({
      step: "scanning",
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
    });
    setTotpCode("");
  }

  async function verifyEnroll() {
    if (enrollState.step !== "scanning") return;
    if (totpCode.length !== 6) return;
    setSubmitting(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrollState.factorId,
      code: totpCode,
    });
    setSubmitting(false);
    if (error) {
      toast.error(t("mfaVerifyError"));
      return;
    }
    toast.success(t("mfaEnabled"));
    setEnrollState({ step: "idle" });
    setTotpCode("");
    reloadFactors();
  }

  async function unenroll(factorId: string) {
    if (!(await confirm({ title: t("mfaDisableConfirm") }))) return;
    setSubmitting(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    setSubmitting(false);
    if (error) {
      toast.error(t("mfaUnenrollError"));
      return;
    }
    toast.success(t("mfaDisabled"));
    reloadFactors();
  }

  function cancelEnroll() {
    setEnrollState({ step: "idle" });
    setTotpCode("");
  }

  const verifiedFactors = factors.filter((f) => f.status === "verified");

  return (
    <div className="space-y-6 max-w-4xl">
      {confirmDialog}
      <h1 className="text-2xl font-semibold tracking-tight">
        {t("security")}
      </h1>

      <ProfileSection />

      <NotificationPreferences />

      {/* MFA section */}
      <section className="rounded-xl border border-card-border bg-card p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold">{t("mfaTitle")}</h2>
          <p className="text-sm text-muted mt-1">{t("mfaDesc")}</p>
        </div>

        {loading ? (
          <div className="h-8 w-24 rounded-md bg-card-border animate-pulse" />
        ) : verifiedFactors.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success-subtle px-2.5 py-0.5 text-xs font-medium text-success-fg">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                {t("mfaActive")}
              </span>
            </div>
            {verifiedFactors.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted">
                  {t("mfaAuthApp")} &mdash;{" "}
                  {formatDateShort(f.created_at, locale)}
                </span>
                <button
                  onClick={() => unenroll(f.id)}
                  disabled={submitting}
                  className="text-danger hover:text-danger-fg text-xs font-medium disabled:opacity-50 cursor-pointer"
                >
                  {t("mfaRemove")}
                </button>
              </div>
            ))}
          </div>
        ) : enrollState.step === "idle" ? (
          <button
            onClick={startEnroll}
            disabled={submitting}
            className={buttonVariants({ size: "xl" })}
          >
            {submitting ? t("mfaEnrolling") : t("mfaEnable")}
          </button>
        ) : null}

        {/* QR Code / verify step */}
        {enrollState.step === "scanning" && (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted">{t("mfaScanInstructions")}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={enrollState.qrCode}
              alt="TOTP QR code"
              className="rounded-lg border border-card-border w-40 h-40"
            />
            <details className="text-xs text-muted">
              <summary className="cursor-pointer select-none">
                {t("mfaManualEntry")}
              </summary>
              <code className="mt-2 block break-all font-mono text-xs bg-surface rounded p-2">
                {enrollState.secret}
              </code>
            </details>
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                {t("mfaCodeLabel")}
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={totpCode}
                onChange={(e) =>
                  setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="123456"
                className="w-36 rounded-lg border border-card-border bg-surface px-3 py-2 text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={verifyEnroll}
                disabled={submitting || totpCode.length !== 6}
                className={buttonVariants({ size: "xl" })}
              >
                {submitting ? t("mfaVerifying") : t("mfaVerify")}
              </button>
              <button
                onClick={cancelEnroll}
                disabled={submitting}
                className={buttonVariants({ variant: "outline" })}
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        )}
      </section>

      <GdprSection />
    </div>
  );
}
