import { log } from "@/lib/logger";

/**
 * Maps raw Postgres / Supabase error text onto a small set of safe, known
 * failure codes.
 *
 * Raw driver messages name tables, columns, constraints and policies. Showing
 * them to a user is both unhelpful ("new row violates row-level security
 * policy for table \"group_enrollments\"") and an unnecessary disclosure of
 * schema internals, so everything that reaches a user goes through here.
 *
 * Anything unrecognised collapses to `unexpected_error` and is logged, so the
 * detail stays available to us without being rendered.
 *
 * Two consumers, one map:
 *  - `/api/v1` (`dbErr`) reports the English text — it is a machine-facing
 *    contract, and it already carries the code separately for clients.
 *  - server actions (`dbActionErr`) translate the code into the request
 *    locale via the `Errors` namespace.
 */
export type DbErrorCode =
  | "account_email_exists"
  | "confirm_email_first"
  | "data_validation_failed"
  | "email_rate_limited"
  | "invalid_credentials"
  | "password_requirements"
  | "permission_denied"
  | "record_not_found"
  | "referenced_record_not_found"
  | "unexpected_error"
  | "value_already_in_use";

const KNOWN_PATTERNS: [RegExp, DbErrorCode][] = [
  // Order matters: the email-specific unique violation must be tested before
  // the general one. Postgres names the constraint in the message, e.g.
  // `unique constraint "profiles_email_key"`, so we match on that rather than
  // assuming every unique violation is an account collision — a duplicate
  // group category used to report "An account with this email already exists."
  [/duplicate key value.*unique constraint.*(email|user)/i, "account_email_exists"],
  [/duplicate key value.*unique constraint/i, "value_already_in_use"],
  [/violates row-level security policy/i, "permission_denied"],
  [/new row violates row-level security/i, "permission_denied"],
  [/permission denied for table/i, "permission_denied"],
  [/violates foreign key constraint/i, "referenced_record_not_found"],
  [/violates check constraint/i, "data_validation_failed"],
  [/relation.*does not exist/i, "unexpected_error"],
  [/column.*of relation.*does not exist/i, "unexpected_error"],
  [/could not find/i, "record_not_found"],
  [/user already registered/i, "account_email_exists"],
  [/email not confirmed/i, "confirm_email_first"],
  [/invalid login credentials/i, "invalid_credentials"],
  [/email rate limit exceeded/i, "email_rate_limited"],
  [/password should be at least/i, "password_requirements"],
];

/** English text per code — the `/api/v1` contract. Mirrored in `Errors.db_*`. */
const ENGLISH: Record<DbErrorCode, string> = {
  account_email_exists: "An account with this email already exists.",
  confirm_email_first: "Please confirm your email before signing in.",
  data_validation_failed: "Data validation failed.",
  email_rate_limited: "Too many emails sent. Please try again later.",
  invalid_credentials: "The email address or password isn't right. Please check both and try again.",
  password_requirements: "Password does not meet requirements.",
  permission_denied: "Permission denied.",
  record_not_found: "Record not found.",
  referenced_record_not_found: "Referenced record not found.",
  unexpected_error: "An unexpected error occurred. Please try again.",
  value_already_in_use: "That value is already in use. Please choose another.",
};

export const GENERIC_DB_ERROR = ENGLISH.unexpected_error;

/** Classifies `raw`, logging whenever it did not match a known pattern. */
export function sanitizeDbCode(raw: string | undefined, context?: string): DbErrorCode {
  const message = raw ?? "";
  for (const [pattern, code] of KNOWN_PATTERNS) {
    if (pattern.test(message)) return code;
  }
  log.error(`[db-error] unrecognised${context ? ` (${context})` : ""}`, { message });
  return "unexpected_error";
}

/** Safe English message for `raw`. Used by the API layer. */
export function sanitizeDbMessage(raw: string | undefined, context?: string): string {
  return ENGLISH[sanitizeDbCode(raw, context)];
}
