import { getTranslations } from "next-intl/server";
import { Users } from "lucide-react";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";

import { GroupListClient } from "./GroupListClient";

export default async function GroupsPage() {
  const ctx = await requireAdmin();
  const supabase = await createClient();
  const t = await getTranslations("Admin");

  const [{ data: groups }, { data: categories }] = await Promise.all([
    supabase
      .from("groups")
      .select("id, name, description, room, is_active, created_at, category_id, group_categories(id, name, color)")
      .eq("mosque_id", ctx.mosqueId)
      .order("created_at", { ascending: false }),
    supabase
      .from("group_categories")
      .select("id, name, color")
      .eq("mosque_id", ctx.mosqueId)
      .order("name", { ascending: true }),
  ]);

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        icon={<Users className="h-5 w-5" />}
        title={t("groups")}
        breadcrumbs={[
          { href: "/admin", label: t("overview") },
          { label: t("groups") },
        ]}
      />

      <GroupListClient
        initialGroups={(groups ?? []).map((g) => ({
          id: g.id,
          name: g.name,
          description: g.description,
          room: g.room,
          is_active: g.is_active,
          created_at: g.created_at,
          category_id: g.category_id,
          category: g.group_categories ? (g.group_categories as { id: string; name: string; color: string }) : null,
        }))}
        categories={categories ?? []}
      />
    </div>
  );
}
