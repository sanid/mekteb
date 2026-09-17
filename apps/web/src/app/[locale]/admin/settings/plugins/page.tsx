import { Puzzle } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { PluginsClient } from "./PluginsClient";

export default async function PluginsPage() {
  const ctx = await requireAdmin();
  const supabase = await createClient();
  const t = await getTranslations("Admin");

  const [{ data: registry }, { data: mosquePlugins }] = await Promise.all([
    supabase
      .from("plugin_registry")
      .select("id, name, description, category, config_schema, sort_order")
      .eq("is_enabled", true)
      .order("sort_order"),
    supabase
      .from("mosque_plugins")
      .select("plugin_id, is_active, config")
      .eq("mosque_id", ctx.mosqueId),
  ]);

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        icon={<Puzzle className="h-5 w-5" />}
        title={t("pluginsTitle")}
        breadcrumbs={[
          { href: "/admin", label: t("overview") },
          { href: "/admin/settings", label: t("settings") },
          { label: t("pluginsTitle") },
        ]}
      />

      <p className="text-sm text-muted-foreground -mt-4">
        {t("pluginsDesc")}
      </p>

      <PluginsClient
        plugins={registry ?? []}
        mosquePlugins={(mosquePlugins ?? []).map((mp) => ({
          plugin_id: mp.plugin_id,
          is_active: mp.is_active,
        }))}
      />
    </div>
  );
}
