/**
 * Constructs the internal Supabase auth email for a username-based student
 * account. Students never see this email — they log in with their username.
 */
export function buildStudentEmail(username: string, mosqueSlug: string): string {
  return `${username.toLowerCase()}@students.${mosqueSlug.toLowerCase()}.mekteb.de`;
}

/**
 * Returns true if the given string looks like a username (no @ sign).
 */
export function isUsername(input: string): boolean {
  return !input.includes("@");
}

export type LoginResolution =
  | { ok: true; email: string }
  | { ok: false; reason: "mosque_missing" | "malformed" };

/**
 * Resolves whatever the user typed in the login field into the address to
 * authenticate with.
 *
 * Students have no email address, so they identify themselves with a
 * **mosque-qualified username** — `al-nour.amina`. The mosque part is required
 * because usernames are only unique *within* a mosque
 * (`unique (mosque_id, lower(username))`), so `amina` alone is ambiguous
 * across tenants.
 *
 * The dot is an unambiguous separator by construction: mosque slugs allow
 * `[a-z0-9-]` and usernames allow letters, numbers, underscores and hyphens —
 * neither permits a dot.
 *
 * `subdomainSlug` preserves the original behaviour on a mosque's own
 * subdomain, where `proxy.ts` already knows the mosque and a bare username is
 * enough. That keeps every existing student login working unchanged.
 *
 * Note there is deliberately **no lookup of the mosque here**. An unknown slug
 * simply produces an address no account holds, so sign-in fails with the same
 * invalid-credentials error as a wrong password. Verifying the slug first
 * would turn this into a mosque-enumeration oracle.
 */
export function resolveLoginEmail(
  rawLogin: string,
  subdomainSlug?: string | null,
): LoginResolution {
  const login = rawLogin.trim();

  // Anything with an @ is an ordinary email account (admin/teacher/parent).
  if (!isUsername(login)) {
    return { ok: true, email: login.toLowerCase() };
  }

  const parts = login.split(".");

  if (parts.length === 2) {
    const [slug, username] = parts;
    if (!slug || !username) return { ok: false, reason: "malformed" };
    return { ok: true, email: buildStudentEmail(username, slug) };
  }

  // Bare username: only resolvable on a mosque subdomain.
  if (parts.length === 1) {
    if (!login) return { ok: false, reason: "malformed" };
    if (!subdomainSlug) return { ok: false, reason: "mosque_missing" };
    return { ok: true, email: buildStudentEmail(login, subdomainSlug) };
  }

  // Two or more dots — don't guess which one separates.
  return { ok: false, reason: "malformed" };
}

/**
 * The login identifier to hand a newly-created student. Admins read this out
 * once, so it must be the form that works everywhere — not the bare username,
 * which only works on the mosque's own subdomain.
 */
export function qualifiedUsername(username: string, mosqueSlug: string): string {
  return `${mosqueSlug.toLowerCase()}.${username.toLowerCase()}`;
}
