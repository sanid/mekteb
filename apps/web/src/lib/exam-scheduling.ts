/**
 * Validates a "YYYY-MM-DD" date string from a FormData entry.
 * Returns null if the value is missing, empty, or not in that format.
 */
export function parseExamDate(value: FormDataEntryValue | null): string | null {
  const s = String(value ?? "").trim();
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

/**
 * Determines the overall pass/fail result of an exam session from its
 * required parts and the examiner's per-part results. An exam with no
 * required parts cannot pass.
 */
export function computeExamResult(opts: {
  oralRequired: boolean;
  oralPassed: boolean;
  writtenRequired: boolean;
  writtenPassed: boolean;
}): "passed" | "failed" {
  const { oralRequired, oralPassed, writtenRequired, writtenPassed } = opts;
  const passed =
    (!oralRequired || oralPassed) &&
    (!writtenRequired || writtenPassed) &&
    (oralRequired || writtenRequired);
  return passed ? "passed" : "failed";
}
