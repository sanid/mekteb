"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Smartphone } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
/**
 * The "you scanned a QR, here is the app" step on the login page.
 *
 * Rendered only when the page arrived via a QR (`?email=…&password=…&open=1`).
 * It tries once — quietly, after a beat, so the page has painted — to hand
 * the credentials to the installed app via the `mekteb://` scheme. If nothing
 * happens (no app, or a browser that blocks custom-scheme redirects), the
 * button below is the same handoff, and the login form itself is pre-filled
 * and fully usable as the fallback.
 *
 * The credentials are the same plaintext the staff member shares anyway;
 * see `loginQrUrl` for the reasoning.
 */
export function OpenInApp({ email, password }: { email: string; password: string }) {
  const t = useTranslations("Auth");
  const url = `mekteb://sign-in?u=${encodeURIComponent(email)}&p=${encodeURIComponent(password)}`;
  const [state, setState] = useState<"idle" | "attempted">("idle");
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    // One attempt, after the page is visibly there. A repeat attempt on every
    // remount would be a modal dialog the user already declined.
    const id = setTimeout(() => {
      window.location.href = url;
      setState("attempted");
    }, 900);
    return () => clearTimeout(id);
  }, [url]);

  return (
    <div className="rounded-xl border border-accent/40 bg-accent-subtle p-4 space-y-2">
      <p className="text-sm font-medium flex items-center gap-2">
        <Smartphone className="h-4 w-4 text-accent" />
        {t("openInApp")}
      </p>
      <p className="text-xs text-muted">{t("openInAppHint")}</p>
      <a
        href={url}
        className={buttonVariants()}
      >
        {t("openInApp")}
      </a>
      {state === "attempted" ? (
        <p className="text-xs text-muted">{t("openInAppNothingHappened")}</p>
      ) : null}
    </div>
  );
}
