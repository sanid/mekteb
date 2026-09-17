/**
 * The URL a "scan to sign in" QR code encodes.
 *
 * Scanning it opens the web login page with the account's credentials
 * pre-filled (`?email=` + `?password=`), which is what `login/page.tsx`
 * already consumes. `open=1` additionally arms the "open in the app" step on
 * that page: the mobile app claims `mekteb://sign-in?u=…&p=…`, so a parent
 * who has the app installed lands in it with the form pre-filled instead of
 * in a browser tab.
 *
 * The password is in the URL — the same plaintext the staff member is told
 * to share, just machine-readable. It expires (7 days) and must be rotated
 * on first login, so a photographed QR is no worse than a photographed
 * screen. `passwordShownOnce` already tells the staff as much.
 */
export function loginQrUrl({
  baseUrl,
  locale,
  login,
  password,
}: {
  /** Origin of the portal the staff member is working in (subdomain-aware). */
  baseUrl: string;
  locale: string;
  /** Email for parents/teachers, username for students. */
  login: string;
  password: string;
}): string {
  return `${baseUrl}/${locale}/login?email=${encodeURIComponent(login)}&password=${encodeURIComponent(password)}&open=1`;
}
