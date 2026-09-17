import type { PluginId } from "@/lib/plugins";
import { createSupabaseForUser } from "./api-auth";
import { notFound } from "./response";

/**
 * API counterpart to `requirePlugin` in `@/lib/plugins`.
 *
 * Plugins are per-mosque feature switches, and the web portals already hide
 * and block anything disabled. The `/api/v1` layer did not check them at all,
 * so a client could read, say, the lesson library from a mosque that had
 * turned it off.
 *
 * Note this cannot reuse `getActivePlugins()` from `@/lib/plugins`: that
 * builds a **cookie-backed** Supabase client, and API requests authenticate
 * with a bearer token and carry no cookies. The query would run
 * unauthenticated, RLS would return nothing, and every plugin would look
 * disabled. Always resolve plugins from the request-scoped client.
 */
export async function activePluginsForRequest(
  request: Request,
  mosqueId: string,
): Promise<Set<string>> {
  const supabase = createSupabaseForUser(request);
  const { data } = await supabase
    .from("mosque_plugins")
    .select("plugin_id")
    .eq("mosque_id", mosqueId)
    .eq("is_active", true);
  return new Set((data ?? []).map((r) => r.plugin_id));
}

/**
 * Returns a response to bail out with when `plugin` is off, or null to
 * continue — mirroring the `requireApiX` helpers:
 *
 *   const gate = await requireApiPlugin(request, ctx.mosqueId, "lesson_library");
 *   if (gate) return gate;
 *
 * 404 rather than 403 on purpose: to a client whose mosque has the feature
 * off, the resource genuinely does not exist, and 404 avoids confirming that
 * some *other* mosque has it enabled.
 */
export async function requireApiPlugin(
  request: Request,
  mosqueId: string,
  plugin: PluginId,
): Promise<Response | null> {
  const active = await activePluginsForRequest(request, mosqueId);
  if (active.has(plugin)) return null;
  return notFound("This feature is not enabled for your mosque.");
}
