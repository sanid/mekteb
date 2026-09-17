import { getTranslations } from "next-intl/server";
import { ClipboardList } from "lucide-react";

import { requireAdmin } from "@/lib/auth";
import { requirePlugin } from "@/lib/plugins";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { EnrollmentListClient, type EnrollmentRequest } from "./EnrollmentListClient";

export default async function AdminEnrollmentPage() {
  const ctx = await requireAdmin();
  await requirePlugin(ctx.mosqueId, "enrollment", "/admin");
  const supabase = await createClient();
  const t = await getTranslations("Admin");

  const { data } = await supabase
    .from("enrollment_requests")
    .select("id, parent_name, parent_email, parent_phone, child_name, child_birth_year, message, status, created_at")
    .eq("mosque_id", ctx.mosqueId)
    .order("created_at", { ascending: false });

  const requests = (data ?? []) as unknown as EnrollmentRequest[];

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        icon={<ClipboardList className="h-5 w-5" />}
        title={t("enrollmentRequests")}
        description={t("enrollmentRequestsDesc")}
        breadcrumbs={[
          { href: "/admin", label: t("overview") },
          { label: t("enrollmentRequests") },
        ]}
      />

      <EnrollmentListClient
        requests={requests}
        labels={{
          empty: t("enrollmentEmpty"),
          pending: t("enrollmentStatusPending"),
          approved: t("enrollmentStatusApproved"),
          rejected: t("enrollmentStatusRejected"),
          approve: t("enrollmentApprove"),
          reject: t("enrollmentReject"),
          delete: t("delete"),
          createAccount: t("enrollmentCreateAccount"),
          born: t("enrollmentBorn"),
          filterAll: t("enrollmentFilterAll"),
          filterPending: t("enrollmentFilterPending"),
        }}
      />
    </div>
  );
}
