import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

export type MosqueSlugInfo = {
  id: string;
  name: string;
  slug: string;
};

/**
 * Reads the x-mosque-slug header injected by the middleware (from the
 * subdomain, e.g. al-nour.mekteb.de) and returns the matching mosque row.
 * Returns null when running on the root domain or when the slug is unknown.
 *
 * Uses the admin client because the login page is unauthenticated and the
 * mosques table is not publicly readable.
 */
export async function getMosqueForRequest(): Promise<MosqueSlugInfo | null> {
  const store = await headers();
  const slug = store.get("x-mosque-slug");
  if (!slug) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("mosques")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (!data) return null;
  return { id: data.id, name: data.name, slug: data.slug };
}
