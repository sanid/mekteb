"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbActionErr, type ActionResult } from "@/lib/action-result";
import { actionError } from "@/lib/action-errors";


export async function togglePlugin(pluginId: string, active: boolean): Promise<ActionResult> {
  const ctx = await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("mosque_plugins")
    .upsert(
      {
        mosque_id: ctx.mosqueId,
        plugin_id: pluginId,
        is_active: active,
        activated_by: ctx.userId,
        activated_at: active ? new Date().toISOString() : null,
      },
      { onConflict: "mosque_id,plugin_id" },
    );

  if (error) return await dbActionErr(error.message, "togglePlugin");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function savePluginConfig(formData: FormData): Promise<ActionResult> {
  const ctx = await requireAdmin();
  const pluginId = String(formData.get("plugin_id") ?? "").trim();
  const configJson = String(formData.get("config") ?? "{}").trim();

  if (!pluginId) return await actionError("plugin_id_missing");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let config: any;
  try {
    config = JSON.parse(configJson);
  } catch {
    return await actionError("invalid_config_json");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("mosque_plugins")
    .upsert(
      {
        mosque_id: ctx.mosqueId,
        plugin_id: pluginId,
        config,
        activated_by: ctx.userId,
      },
      { onConflict: "mosque_id,plugin_id" },
    );

  if (error) return await dbActionErr(error.message, "savePluginConfig");
  revalidatePath("/", "layout");
  return { ok: true };
}
