import { getTranslations } from "next-intl/server";
import { BookOpen } from "lucide-react";

import { requireAdmin } from "@/lib/auth";
import { getActivePlugins } from "@/lib/plugins";
import { PageHeader } from "@/components/PageHeader";

import NewTeacherForm from "./NewTeacherForm";

export default async function NewTeacherPage() {
  const ctx = await requireAdmin();
  // QR-Selbstanmeldung plugin gate: controls the scan-to-login QR on the
  // success card after creating an account.
  const activePlugins = await getActivePlugins(ctx.mosqueId);
  const qrEnabled = activePlugins.has("qr_self_signup");
  const t = await getTranslations("Admin");
  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        icon={<BookOpen className="h-5 w-5" />}
        title={t("addTeacher")}
        breadcrumbs={[
          { href: "/admin", label: t("overview") },
          { href: "/admin/teachers", label: t("teachers") },
          { label: t("addTeacher") },
        ]}
      />
      <NewTeacherForm qrEnabled={qrEnabled} />
    </div>
  );
}
