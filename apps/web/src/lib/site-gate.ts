import { createHash, timingSafeEqual } from "node:crypto";

/**
 * The pre-launch curtain in front of the public marketing pages.
 *
 * This is **not** an authorization control — everything that actually matters
 * is behind Supabase auth and RLS. It only keeps the unfinished public site
 * out of search results and off casual links, so it fails *open*: with no
 * `SITE_GATE_PASSWORD` configured there is no gate at all. That is deliberate.
 * Failing closed would lock every preview deploy and fresh checkout out of a
 * page that guards nothing.
 */
export const GATE_COOKIE = "site_access";

function gatePassword(): string | null {
  const value = process.env.SITE_GATE_PASSWORD?.trim();
  return value ? value : null;
}

export function gateIsEnabled(): boolean {
  return gatePassword() !== null;
}

/**
 * What the cookie holds.
 *
 * The old gate stored the password itself, which meant anyone who saw the
 * cookie learned the secret — and, worse, anyone could mint the cookie from
 * the browser console without knowing it. A digest is neither readable nor
 * guessable, and it invalidates every existing cookie the moment the password
 * is rotated.
 */
function gateToken(password: string): string {
  return createHash("sha256").update(`mekteb-site-gate:${password}`).digest("hex");
}

/** Constant-time, so a wrong password leaks nothing through response timing. */
function equals(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function checkGatePassword(candidate: string): string | null {
  const password = gatePassword();
  if (!password) return null;
  return equals(candidate, password) ? gateToken(password) : null;
}

export function hasGateAccess(cookieValue: string | undefined): boolean {
  const password = gatePassword();
  if (!password) return true;
  return !!cookieValue && equals(cookieValue, gateToken(password));
}
