import type { User } from "@supabase/supabase-js";

import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

/** Supabase's maximum page size for `listUsers`. */
const PER_PAGE = 1000;

/**
 * Find an auth user by email address.
 *
 * `auth.admin.listUsers()` takes no email filter — passing one is silently
 * ignored and you get an arbitrary page back (see the gotcha in `MEMORY.md`,
 * which once nearly reset a stranger's password). Callers therefore have to
 * scan, and a single `perPage: 1000` call quietly reports "no such user" for
 * everyone past the first page. Page until the address turns up or the pages
 * run out.
 *
 * Returns `{ user: null }` when the address genuinely has no account, and
 * `{ error }` only when the lookup itself failed — the two must not be
 * conflated, or a transient outage reads as "this person does not exist" and
 * the caller creates a duplicate.
 */
export async function findAuthUserByEmail(
  admin: AdminClient,
  email: string,
): Promise<{ user: User | null; error?: undefined } | { user?: undefined; error: string }> {
  const needle = email.trim().toLowerCase();
  if (!needle) return { user: null };

  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PER_PAGE });
    if (error) return { error: error.message };

    const users = data?.users ?? [];
    const match = users.find((u) => u.email?.toLowerCase() === needle);
    if (match) return { user: match };

    // A short page is the last page.
    if (users.length < PER_PAGE) return { user: null };
  }
}
