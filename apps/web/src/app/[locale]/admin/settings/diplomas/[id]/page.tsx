import { notFound } from "next/navigation";
import { Settings } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { DiplomaDesignerClient } from "./DiplomaDesignerClient";

type RouteParams = { params: Promise<{ id: string; locale: string }> };

export default async function DiplomaDesignerPage({ params }: RouteParams) {
  const { id } = await params;
  const ctx = await requireAdmin();
  const supabase = await createClient();
  const t = await getTranslations("Admin");

  const { data: template } = await supabase
    .from("diploma_templates")
    .select("*")
    .eq("id", id)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();

  if (!template) notFound();

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="shrink-0">
        <PageHeader
          icon={<Settings className="h-5 w-5" />}
          title={template.name}
          breadcrumbs={[
            { href: "/admin", label: t("overview") },
            { href: "/admin/settings", label: t("settings") },
            { href: "/admin/settings/diplomas", label: t("diplomaTemplates") },
            { label: template.name },
          ]}
        />
      </div>

      <div className="flex-1 min-h-0 bg-background rounded-xl border border-card-border overflow-hidden">
        <DiplomaDesignerClient
          template={{
            id: template.id,
            name: template.name,
            orientation: template.orientation,
            background_image_url: template.background_image_url,
            elements: (template.elements as never) || [],
          }}
        />
      </div>
    </div>
  );
}
