import { getTranslations } from "next-intl/server";
import { Settings, Tag } from "lucide-react";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { CategoriesClient } from "./CategoriesClient";

export default async function CategoriesPage() {
  const ctx = await requireAdmin();
  const supabase = await createClient();
  const t = await getTranslations("Admin");

  const { data: categories } = await supabase
    .from("group_categories")
    .select("id, name, color, is_hifz")
    .eq("mosque_id", ctx.mosqueId)
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        icon={<Tag className="h-5 w-5" />}
        title={t("manageCategories")}
        breadcrumbs={[
          { href: "/admin", label: t("overview") },
          { href: "/admin/settings", label: t("settings") },
          { label: t("categories") },
        ]}
      />

      <CategoriesClient initialCategories={categories ?? []} />
    </div>
  );
}
