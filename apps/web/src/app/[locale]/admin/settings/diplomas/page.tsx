import { Settings } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { TemplatesListClient } from "./TemplatesListClient";
import { seedStandardTemplates } from "./actions";

export default async function DiplomaTemplatesDashboard() {
  const ctx = await requireAdmin();
  const supabase = await createClient();
  const t = await getTranslations("Admin");

  // Ensure the 3 standard templates exist for this mosque
  await seedStandardTemplates();

  const { data: templates } = await supabase
    .from("diploma_templates")
    .select("id, name, orientation, is_active, system_key, background_image_url, created_at")
    .eq("mosque_id", ctx.mosqueId)
    .order("system_key", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        icon={<Settings className="h-5 w-5" />}
        title={t("diplomaTemplates")}
        breadcrumbs={[
          { href: "/admin", label: t("overview") },
          { href: "/admin/settings", label: t("settings") },
          { label: t("diplomaTemplates") },
        ]}
      />

      <TemplatesListClient initialTemplates={templates ?? []} />
    </div>
  );
}
