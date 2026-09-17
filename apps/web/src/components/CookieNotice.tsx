"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { useIsHydrated } from "@/hooks/use-is-hydrated";

const STORAGE_KEY = "cookie-notice-dismissed";

export function CookieNotice() {
  const t = useTranslations("Auth");
  // Render nothing during SSR / first client render to avoid hydration
  // mismatches with siblings (Sonner's <Toaster> reorders DOM nearby).
  const hydrated = useIsHydrated();
  const [dismissed, setDismissed] = useState(false);

  if (!hydrated) return null;
  if (dismissed || localStorage.getItem(STORAGE_KEY)) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4">
      <div className="mx-auto max-w-2xl flex items-center gap-3 rounded-xl border border-card-border bg-card p-4 shadow-lg">
        <p className="text-sm text-muted flex-1">
          {t("cookieNotice")}
        </p>
        <button
          onClick={() => {
            localStorage.setItem(STORAGE_KEY, "1");
            setDismissed(true);
          }}
          className={buttonVariants({ size: "sm" })}
        >
          {t("cookieAccept")}
        </button>
      </div>
    </div>
  );
}
