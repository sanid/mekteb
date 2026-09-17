"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { buttonVariants } from "@/components/ui/button";
import { MosqueIcon } from "@/components/icons";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  const t = useTranslations("Error");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <MosqueIcon className="h-12 w-12 text-accent mb-6" />
      <h1 className="text-2xl font-semibold mb-2">{t("title")}</h1>
      <p className="text-muted mb-6 max-w-sm">{t("description")}</p>
      {error.digest && (
        <p className="font-mono text-xs text-muted mb-6">ID: {error.digest}</p>
      )}
      <div className="flex gap-3">
        <button
          onClick={reset}
          className={buttonVariants({ size: "xl" })}
        >
          {t("retry")}
        </button>
        <Link
          href="/"
          className={buttonVariants({ variant: "outline" })}
        >
          {t("home")}
        </Link>
      </div>
    </main>
  );
}
