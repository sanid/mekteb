"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/routing";
import { ChangeEvent, useTransition } from "react";

const LANGUAGES = [
  { code: "de", label: "Deutsch" },
  { code: "en", label: "English" },
  { code: "bs", label: "Bosanski" },
  { code: "tr", label: "Türkçe" },
];

export default function LanguageSwitcher({
  fullReload = false,
  locales,
}: {
  fullReload?: boolean;
  /** Restrict the options; defaults to every supported language. */
  locales?: string[];
}) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const onSelectChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextLocale = event.target.value;
    if (fullReload) {
      window.location.assign(`/${nextLocale}${pathname === "/" ? "" : pathname}`);
      return;
    }
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  };

  return (
    <select
      defaultValue={locale}
      disabled={isPending}
      onChange={onSelectChange}
      className="h-8 w-full bg-card hover:bg-neutral-100 dark:hover:bg-neutral-800 text-sm border border-card-border rounded-lg px-2.5 outline-none transition-colors cursor-pointer text-muted-foreground hover:text-foreground font-medium"
    >
      {LANGUAGES.filter((l) => !locales || locales.includes(l.code)).map((l) => (
        <option key={l.code} value={l.code} className="bg-card text-foreground">
          {l.label}
        </option>
      ))}
    </select>
  );
}
