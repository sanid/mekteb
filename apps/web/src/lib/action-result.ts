import { getTranslations } from "next-intl/server";

import { sanitizeDbCode } from "@/lib/db-error";

/**
 * The single result contract for every server action.
 *
 * One shape only: `{ error }` on failure, `{ ok: true }` (plus optional
 * `data`) on success. Consumers — `ActionForm`, `useActionState` callers —
 * discriminate with `"error" in result`.
 *
 * Do not reintroduce a `{ ok: false, error }` variant: it reads as a third
 * state to anything checking `result.ok === true` after an `"error" in` guard.
 */
export type ActionResult<T = never> =
  | { error: string; code?: string }
  | ([T] extends [never] ? { ok: true } : { ok: true; data: T });

/** Success, optionally carrying a payload. */
export function actionOk(): { ok: true };
export function actionOk<T>(data: T): { ok: true; data: T };
export function actionOk<T>(data?: T) {
  return data === undefined ? { ok: true as const } : { ok: true as const, data };
}

/** Failure with a message already safe to show the user. */
export function actionErr(message: string): { error: string } {
  return { error: message };
}

/**
 * `code` is the optional machine-readable twin of `error`: same failure, but
 * stable across locales so a caller can branch on it (the appoint-admin form
 * offers to create the account when it sees `no_account_for_email`). It is
 * additive — `"error" in result` still discriminates, and this is *not* a
 * third state.
 */

/**
 * Failure originating from Postgres/Supabase. Classifies the raw driver
 * message with the same allowlist the `/api/v1` layer uses, then renders it
 * in the request locale — so a DB failure reads like every other error the
 * user sees rather than like a Postgres log line.
 *
 * `context` is logged, never shown — use it to say where the error came from
 * (e.g. `"enrollStudent"`).
 */
export async function dbActionErr(
  raw: string | undefined,
  context?: string,
): Promise<{ error: string }> {
  const t = await getTranslations("Errors");
  return { error: t(`db_${sanitizeDbCode(raw, context)}`) };
}
