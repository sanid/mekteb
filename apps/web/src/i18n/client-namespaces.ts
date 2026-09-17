/**
 * Message namespaces that client components read through `useTranslations`.
 * Only these are serialized into the page for NextIntlClientProvider — the
 * rest (e.g. `Mobile`, `Errors`, `Privacy`) are server-only and would add
 * ~35 KB to every HTML response for nothing.
 *
 * `client-namespaces.test.ts` fails when a component uses a namespace that
 * is missing here, so a new namespace can't silently render raw keys.
 */
export const CLIENT_NAMESPACES = [
  "Account",
  "Admin",
  "Auth",
  "Billing",
  "Calendar",
  "Demo",
  "Error",
  "ExamGrading",
  "Examiner",
  "Index",
  "Messaging",
  "NotFound",
  "Notifications",
  "Onboarding",
  "Parent",
  "PlatformAdmin",
  "Pricing",
  "Quran",
  "Security",
  "Student",
  "Teacher",
  "WrittenTest",
  "WrittenTests",
] as const;
