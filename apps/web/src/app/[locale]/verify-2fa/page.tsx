"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Link } from "@/i18n/routing";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Verify2FAPage() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const router = useRouter();
  const supabase = createClient();

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6) return;

    setError(null);
    setLoading(true);

    try {
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const verified = (factorsData?.totp ?? []).filter(
        (f) => f.status === "verified",
      );

      if (verified.length === 0) {
        router.push(`/${locale}/auth/redirect`);
        return;
      }

      const factorId = verified[0].id;

      const { data: challengeData, error: challengeError } =
        await supabase.auth.mfa.challenge({
          factorId,
        });
      if (challengeError) {
        setError(challengeError.message);
        setLoading(false);
        return;
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      });
      if (verifyError) {
        setError(verifyError.message);
        setLoading(false);
        return;
      }

      router.push(`/${locale}/auth/redirect`);
    } catch {
      setError(t("mfaVerifyFailed"));
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 grid place-items-center p-8">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-5 rounded-xl border border-card-border bg-card p-6 shadow-lg"
      >
        <div className="flex flex-col items-center gap-2 pb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-subtle">
            <svg
              className="h-5 w-5 text-accent"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold">{t("mfaVerifyTitle")}</h1>
          <p className="text-sm text-muted text-center">
            {t("mfaVerifyDesc")}
          </p>
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-medium">{t("mfaCodeLabel")}</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="123456"
            autoFocus
            className="w-full rounded-lg border border-card-border bg-background px-3 py-2.5 text-center text-lg tracking-[0.5em] font-mono transition-colors focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/20"
          />
        </label>

        {error && (
          <p className="text-sm text-danger-fg" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className={cn(buttonVariants({ size: "xl" }), "w-full")}
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("mfaVerifyButton")}
        </button>

        <div className="flex flex-col items-center gap-2 pt-1">
          <Link
            href="/login"
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            {t("mfaBackToLogin")}
          </Link>
        </div>
      </form>
    </main>
  );
}
