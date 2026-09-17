import {
  DATE_LOCALE,
  defaultLocale,
  isLocale,
  messages,
  type Locale,
} from "@mekteb/i18n";

/**
 * Message lookup against the shared catalogue — the same ~1,700 keys the web
 * app uses, imported rather than copied so the two cannot drift.
 *
 * **The app is German-first** (AGENTS.md §3): it *starts* in German for
 * everyone, regardless of what the device reports. The mosque's own language
 * is German, so a phone set to English belonging to a German-speaking family
 * should not silently flip the whole app. Another language is a deliberate
 * choice made through `setLocale`, not something inferred from the OS.
 */
let current: Locale = defaultLocale;

export function setLocale(locale: string) {
  if (isLocale(locale)) current = locale;
}

export function getLocale(): Locale {
  return current;
}

/** BCP-47 tag for `Intl`. Never pass the bare app code (AGENTS.md §3). */
export function intlLocale(): string {
  return DATE_LOCALE[current];
}

type Vars = Record<string, string | number>;

/**
 * Looks up `key` in `namespace`, substituting `{placeholders}`.
 *
 * Falls back through German before giving up, so a key present in `de` but not
 * yet translated shows German rather than a raw key name on screen.
 */
export function t(namespace: string, key: string, vars?: Vars): string {
  const lookup = (loc: Locale) =>
    (messages[loc]?.[namespace] as Record<string, string> | undefined)?.[key];

  const raw = lookup(current) ?? lookup(defaultLocale) ?? key;

  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in vars ? String(vars[name]) : `{${name}}`,
  );
}

/** Shorthand for this app's own strings, which all live under `Mobile`. */
export function tm(key: string, vars?: Vars): string {
  return t("Mobile", key, vars);
}

/**
 * Human name for a role code.
 *
 * The API returns `mosque_admin`, `teacher`, … — codes, not labels. Printing
 * them raw put an English word in the middle of a German screen; unknown codes
 * still fall back to the code so a new role shows *something*.
 */
export function roleLabel(role: string): string {
  const key = {
    teacher: "roleTeacher",
    parent: "roleParent",
    student: "roleStudent",
    mosque_admin: "roleAdmin",
    platform_owner: "roleAdmin",
    examiner: "roleExaminer",
    assistant: "roleAssistant",
  }[role];
  return key ? tm(key) : role.replace(/_/g, " ");
}

/** All date formatting goes through here — never `toLocaleDateString()`. */
export function formatDate(
  value: string | number | Date,
  options: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" },
): string {
  const d = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(intlLocale(), options).format(d);
}

export type { Locale };
