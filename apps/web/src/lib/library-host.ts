/**
 * Host handling for public libraries on their own subdomain
 * (e.g. ilmihal-ikb.mekteb.de → /{locale}/library/{mosque slug}).
 *
 * Used by the proxy, so it only talks to Supabase via plain fetch with the
 * anon key, through the security-definer `resolve_library_subdomain` RPC.
 */

const TTL_MS = 60_000;
const cache = new Map<string, { slug: string | null; expires: number }>();

/** The part in front of the root domain, or null on the root domain itself. */
export function subdomainFromHost(host: string): string | null {
  const hostname = host.split(":")[0].toLowerCase();
  const roots = [process.env.ROOT_DOMAIN ?? "mekteb.de"];
  // Lets `ilmihal-ikb.localhost:3000` work in development.
  if (process.env.NODE_ENV === "development") roots.push("localhost");
  for (const root of roots) {
    if (hostname.endsWith(`.${root}`)) {
      const sub = hostname.slice(0, hostname.length - root.length - 1);
      return sub && sub !== "www" && !sub.includes(".") ? sub : null;
    }
  }
  return null;
}

/** Mosque slug of the enabled library on this subdomain, if any. */
export async function resolveLibrarySubdomain(subdomain: string): Promise<string | null> {
  const hit = cache.get(subdomain);
  if (hit && hit.expires > Date.now()) return hit.slug;

  let slug: string | null = null;
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/resolve_library_subdomain`,
      {
        method: "POST",
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ p_subdomain: subdomain }),
      },
    );
    if (res.ok) slug = ((await res.json()) as string | null) ?? null;
  } catch {
    // Treat lookup failures as "not a library" — the mosque portal still works.
    return null;
  }
  cache.set(subdomain, { slug, expires: Date.now() + TTL_MS });
  return slug;
}

/** Public URL of a library subdomain, for display in the admin. */
export function librarySubdomainUrl(subdomain: string): string {
  return `https://${subdomain}.${process.env.ROOT_DOMAIN ?? "mekteb.de"}`;
}
