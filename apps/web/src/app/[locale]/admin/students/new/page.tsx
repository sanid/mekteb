import { getTranslations } from "next-intl/server";
import { GraduationCap } from "lucide-react";

import { requireAdmin } from "@/lib/auth";
import { getActivePlugins } from "@/lib/plugins";
import { PageHeader } from "@/components/PageHeader";

import NewStudentForm from "./NewStudentForm";

export default async function NewStudentPage() {
  const ctx = await requireAdmin();
  // QR-Selbstanmeldung plugin gate: controls the scan-to-login QR on the
  // success card after creating an account.
  const activePlugins = await getActivePlugins(ctx.mosqueId);
  const qrEnabled = activePlugins.has("qr_self_signup");
  const t = await getTranslations("Admin");
  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        icon={<GraduationCap className="h-5 w-5" />}
        title={t("addStudentWithLogin")}
        breadcrumbs={[
          { href: "/admin", label: t("overview") },
          { href: "/admin/students", label: t("students") },
          { label: t("addStudentWithLogin") },
        ]}
      />
      <NewStudentForm qrEnabled={qrEnabled} />
    </div>
  );
}
