import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PluginsClient } from "../plugins/PluginsClient";

export async function PluginsTab() {
  const ctx = await requireAdmin();
  const supabase = await createClient();

  const [{ data: registry }, { data: mosquePlugins }] = await Promise.all([
    supabase.from("plugin_registry").select("id, name, description, category, sort_order").eq("is_enabled", true).order("sort_order"),
    supabase.from("mosque_plugins").select("plugin_id, is_active").eq("mosque_id", ctx.mosqueId),
  ]);

  return (
    <div className="pt-6">
      <PluginsClient
        plugins={registry ?? []}
        mosquePlugins={(mosquePlugins ?? []).map((mp) => ({ plugin_id: mp.plugin_id, is_active: mp.is_active }))}
      />
    </div>
  );
}
