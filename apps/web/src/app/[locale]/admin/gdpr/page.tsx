import { getTranslations } from "next-intl/server";
import { Shield } from "lucide-react";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import GdprAdminTable from "./GdprAdminTable";

export default async function AdminGdprPage() {
  const ctx = await requireAdmin();
  const supabase = await createClient();
  const t = await getTranslations("Admin");

  const { data: requests } = await supabase
    .from("gdpr_requests")
    .select(
      "id, user_id, email, type, status, reason, requested_at, processed_at, processed_by",
    )
    .eq("mosque_id", ctx.mosqueId)
    .order("requested_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        icon={<Shield className="h-5 w-5" />}
        title={t("gdpr")}
        breadcrumbs={[
          { href: "/admin", label: t("overview") },
          { label: t("gdpr") },
        ]}
      />

      <p className="text-sm text-muted max-w-3xl">{t("gdprAdminDesc")}</p>

      <GdprAdminTable initial={requests ?? []} />
    </div>
  );
}
