import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

/**
 * Returns the German Bundesland configured for a mosque (used to filter
 * school_holidays). Cached per-request so multiple call sites in a page
 * resolve to one query.
 */
export const getMosqueState = cache(async (mosqueId: string): Promise<string> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mosques")
    .select("state")
    .eq("id", mosqueId)
    .maybeSingle();
  return ((data as { state?: string | null } | null)?.state ?? "Berlin");
});
