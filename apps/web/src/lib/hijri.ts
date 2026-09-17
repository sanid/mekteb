/**
 * Hijri (Islamic) date formatting. Uses the platform Intl implementation with
 * the Umm al-Qura calendar — zero dependencies, fully localised. Falls back to
 * the generic `islamic` calendar if `islamic-umalqura` is unavailable.
 */
export function formatHijri(date: Date, locale: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
  };
  try {
    return new Intl.DateTimeFormat(`${locale}-u-ca-islamic-umalqura`, opts).format(date);
  } catch {
    try {
      return new Intl.DateTimeFormat(`${locale}-u-ca-islamic`, opts).format(date);
    } catch {
      return new Intl.DateTimeFormat("en-u-ca-islamic", opts).format(date);
    }
  }
}
