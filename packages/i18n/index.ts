/**
 * The single message catalogue, shared by the web app and the mobile app.
 *
 * It lives in its own package rather than inside `apps/web` so neither app
 * owns it — the catalogue is ~1,640 keys across four locales and drifts the
 * moment there are two copies. `pnpm check:i18n` enforces that every locale
 * has exactly the same key set.
 */
import de from "./messages/de.json";
import en from "./messages/en.json";
import bs from "./messages/bs.json";
import tr from "./messages/tr.json";

export const locales = ["de", "en", "bs", "tr"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "de";

/** Statically bundled so Metro and Turbopack can both resolve it. */
export const messages: Record<Locale, Record<string, unknown>> = { de, en, bs, tr };

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** BCP-47 tag per locale. Never hand a bare app code to `Intl`. */
export const DATE_LOCALE: Record<Locale, string> = {
  de: "de-DE",
  en: "en-US",
  bs: "bs-BA",
  tr: "tr-TR",
};

/**
 * What each language calls itself. A language picker written in the language
 * you are trying to leave is no use — someone who reads only Bosnian needs to
 * find "Bosanski", not "Bosnisch".
 */
export const LOCALE_NAMES: Record<Locale, string> = {
  de: "Deutsch",
  en: "English",
  bs: "Bosanski",
  tr: "Türkçe",
};
