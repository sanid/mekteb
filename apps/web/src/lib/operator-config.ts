/**
 * Site operator details for the Impressum (§ 5 TMG) and the public footer.
 *
 * These are deployment-specific and deliberately NOT hardcoded: this repo is
 * public, so whoever runs an instance supplies their own legal details via
 * environment variables. The fallbacks are placeholders — a production
 * deployment in Germany must set the real values or the Impressum is invalid.
 */
export const operatorConfig = {
  name: process.env.NEXT_PUBLIC_OPERATOR_NAME ?? "",
  street: process.env.NEXT_PUBLIC_OPERATOR_STREET ?? "",
  postalCity: process.env.NEXT_PUBLIC_OPERATOR_POSTAL_CITY ?? "",
  country: process.env.NEXT_PUBLIC_OPERATOR_COUNTRY ?? "Deutschland",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "",
} as const;

/** True when enough is configured to render a legally usable Impressum. */
export const hasOperatorDetails =
  operatorConfig.name !== "" && operatorConfig.street !== "";
