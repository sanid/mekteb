import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Settings } from "lucide-react";

import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { TabBar, type TabId } from "./TabBar";
import { GeneralTab }    from "./tabs/GeneralTab";
import { BillingTab }    from "./tabs/BillingTab";
import { PluginsTab }    from "./tabs/PluginsTab";
import { CategoriesTab } from "./tabs/CategoriesTab";
import { DiplomasTab }   from "./tabs/DiplomasTab";
import { DeviceTokensTab } from "./tabs/DeviceTokensTab";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; success?: string; canceled?: string }>;
}) {
  await requireAdmin();
  const t  = await getTranslations("Admin");
  const sp = await searchParams;
  const tab = (sp.tab ?? "general") as TabId;

  const tabLabels: Record<TabId, string> = {
    general:    t("settingsTabGeneral"),
    billing:    t("settingsTabBilling"),
    plugins:    t("settingsTabPlugins"),
    categories: t("settingsTabCategories"),
    diplomas:   t("settingsTabDiplomas"),
    devices:    t("settingsTabDevices"),
  };

  return (
    <div className="space-y-0 max-w-4xl">
      <PageHeader
        icon={<Settings className="h-5 w-5" />}
        title={t("settings")}
        breadcrumbs={[
          { href: "/admin", label: t("overview") },
          { label: t("settings") },
        ]}
      />

      <Suspense>
        <TabBar labels={tabLabels} />
      </Suspense>

      {tab === "general"    && <GeneralTab />}
      {tab === "billing"    && <BillingTab success={sp.success} canceled={sp.canceled} />}
      {tab === "plugins"    && <PluginsTab />}
      {tab === "categories" && <CategoriesTab />}
      {tab === "diplomas"   && <DiplomasTab />}
      {tab === "devices"    && <DeviceTokensTab />}
    </div>
  );
}
