import { routing } from "@/i18n/routing";

/**
 * Locale-aware date/time formatting.
 *
 * Always format through this module rather than calling
 * `toLocaleDateString()` / `toLocaleString()` directly. A bare call uses the
 * *runtime's* locale — Node's default on the server, the browser's on the
 * client — which is neither the mosque's language nor stable between the two,
 * so it renders German dates for Bosnian users and risks hydration mismatches.
 *
 * On the server get `locale` from `getLocale()` (next-intl/server); in client
 * components from `useLocale()`.
 */

type AppLocale = (typeof routing.locales)[number];

/** BCP-47 tag for each app locale, used to drive `Intl`. */
const DATE_LOCALE: Record<AppLocale, string> = {
  de: "de-DE",
  en: "en-US",
  bs: "bs-BA",
  tr: "tr-TR",
};

const DEFAULT_TAG = DATE_LOCALE[routing.defaultLocale as AppLocale];

/** Resolves an app locale (or any stray string) to a BCP-47 tag. */
export function dateFormatLocale(locale: string): string {
  return DATE_LOCALE[locale as AppLocale] ?? DEFAULT_TAG;
}

function toDate(value: Date | string | number): Date {
  return value instanceof Date ? value : new Date(value);
}

/** e.g. "5. August 2026" (de) / "August 5, 2026" (en). */
export function formatDate(
  value: Date | string | number,
  locale: string,
  options: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" },
): string {
  return new Intl.DateTimeFormat(dateFormatLocale(locale), options).format(toDate(value));
}

/** Compact numeric form, e.g. "05.08.2026" (de) / "8/5/2026" (en). */
export function formatDateShort(value: Date | string | number, locale: string): string {
  return formatDate(value, locale, { year: "numeric", month: "2-digit", day: "2-digit" });
}

/** Date plus hour and minute. */
export function formatDateTime(value: Date | string | number, locale: string): string {
  return formatDate(value, locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Hour and minute only. */
export function formatTime(value: Date | string | number, locale: string): string {
  return new Intl.DateTimeFormat(dateFormatLocale(locale), {
    hour: "2-digit",
    minute: "2-digit",
  }).format(toDate(value));
}
