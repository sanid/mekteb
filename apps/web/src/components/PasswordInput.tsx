"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowBigUpDash, Eye, EyeOff } from "lucide-react";

export function PasswordInput({
  className = "",
  onKeyDown,
  onKeyUp,
  onBlur,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  const t = useTranslations("Auth");
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  // getModifierState only answers on key/pointer events, so check on each key.
  const readCaps = (e: React.KeyboardEvent<HTMLInputElement>) =>
    setCapsLock(e.getModifierState?.("CapsLock") ?? false);

  return (
    <div>
      <div className="relative">
        <input
          {...props}
          type={visible ? "text" : "password"}
          onKeyDown={(e) => {
            readCaps(e);
            onKeyDown?.(e);
          }}
          onKeyUp={(e) => {
            readCaps(e);
            onKeyUp?.(e);
          }}
          onBlur={(e) => {
            setCapsLock(false);
            onBlur?.(e);
          }}
          className={`w-full rounded-lg border border-card-border bg-background px-3 py-2 pr-10 text-sm transition-colors focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/20 ${className}`}
        />
        <button
          type="button"
          aria-label={visible ? t("hidePassword") : t("showPassword")}
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted transition-colors hover:text-accent focus:outline-none focus:ring-3 focus:ring-accent/20 rounded-r-lg"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {capsLock ? (
        <p
          role="status"
          className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-warning-subtle px-2 py-0.5 text-xs font-medium text-warning-fg animate-in fade-in"
        >
          <ArrowBigUpDash className="h-3.5 w-3.5" />
          {t("capsLockOn")}
        </p>
      ) : null}
    </div>
  );
}
