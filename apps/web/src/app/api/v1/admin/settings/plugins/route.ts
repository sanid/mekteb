import { NextRequest } from "next/server";
import { z } from "zod";

import {
  requireApiAdmin,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, okNoStore, dbErr, unauthorized, badRequest } from "@/app/api/v1/helpers/response";
import { parseJson } from "@/app/api/v1/helpers/validate";

const putSchema = z.object({
  plugin_id: z.string().min(1),
  is_active: z.boolean(),
});

/**
 * The per-mosque feature switches, for the phone: lists the registry and the
 * mosque's current state, and toggles one plugin — the API counterpart of the
 * web `togglePlugin` server action.
 *
 * The config schema is deliberately not exposed; toggling is the operation
 * admins actually do from a phone.
 */
export async function GET(request: NextRequest) {
  const ctx = await requireApiAdmin(request);
  if (!ctx) return unauthorized();

  const supabase = await createSupabaseForUser(request);
  const [registryRes, stateRes] = await Promise.all([
    supabase
      .from("plugin_registry")
      .select("id, name, description, category, sort_order")
      .eq("is_enabled", true)
      .order("sort_order"),
    supabase
      .from("mosque_plugins")
      .select("plugin_id, is_active")
      .eq("mosque_id", ctx.mosqueId),
  ]);

  if (registryRes.error) return dbErr(registryRes.error.message);
  if (stateRes.error) return dbErr(stateRes.error.message);

  const state = new Map(
    (stateRes.data ?? []).map((mp) => [mp.plugin_id, mp.is_active]),
  );

  return okNoStore({
    plugins: (registryRes.data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      category: p.category,
      is_active: state.get(p.id) ?? false,
    })),
  });
}

export async function PUT(request: NextRequest) {
  const ctx = await requireApiAdmin(request);
  if (!ctx) return unauthorized();

  const parsed = await parseJson(request, putSchema);
  if (!parsed.ok) return parsed.response;
  const { plugin_id, is_active } = parsed.data;

  const supabase = await createSupabaseForUser(request);

  // Only registry-listed, enabled plugins can be toggled — a typo'd id
  // would otherwise silently create a stray mosque_plugins row.
  const { data: known } = await supabase
    .from("plugin_registry")
    .select("id")
    .eq("id", plugin_id)
    .eq("is_enabled", true)
    .maybeSingle();
  if (!known) return badRequest("Unknown plugin");

  const { error } = await supabase.from("mosque_plugins").upsert(
    {
      mosque_id: ctx.mosqueId,
      plugin_id,
      is_active,
      activated_by: ctx.userId,
      activated_at: is_active ? new Date().toISOString() : null,
    },
    { onConflict: "mosque_id,plugin_id" },
  );
  if (error) return dbErr(error.message);

  return ok({ plugin_id, is_active });
}
