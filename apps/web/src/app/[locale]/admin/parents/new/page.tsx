import { getTranslations } from "next-intl/server";
import { Heart } from "lucide-react";

import { requireAdmin } from "@/lib/auth";
import { getActivePlugins } from "@/lib/plugins";
import { PageHeader } from "@/components/PageHeader";

import NewParentForm from "./NewParentForm";

export default async function NewParentPage() {
  const ctx = await requireAdmin();
  // QR-Selbstanmeldung plugin gate: controls the scan-to-login QR on the
  // success card after creating an account.
  const activePlugins = await getActivePlugins(ctx.mosqueId);
  const qrEnabled = activePlugins.has("qr_self_signup");
  const t = await getTranslations("Admin");
  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        icon={<Heart className="h-5 w-5" />}
        title={t("addParent")}
        breadcrumbs={[
          { href: "/admin", label: t("overview") },
          { href: "/admin/parents", label: t("parents") },
          { label: t("addParent") },
        ]}
      />
      <NewParentForm qrEnabled={qrEnabled} />
    </div>
  );
}
