import { getTranslations } from "next-intl/server";
import { Building2 } from "lucide-react";

import { Link } from "@/i18n/routing";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { FormField, FormCard, inputCls, selectCls } from "@/components/FormField";
// ActionForm still used for createMosque form below
import { CollapsibleAddCard } from "@/components/CollapsibleAddCard";
import { createMosque } from "./actions";
import { MosqueSwitcherForm } from "./MosqueSwitcherForm";
import { buttonVariants } from "@/components/ui/button";

import { cn } from "@/lib/utils";
export default async function ManageMosquesPage() {
  const ctx = await requireAdmin();
  const t = await getTranslations("Admin");
  const supabase = await createClient();

  // Fetch all mosques this user is admin of
  const { data: memberships } = await supabase
    .from("memberships")
    .select("mosque_id, mosques(id, name, slug)")
    .eq("user_id", ctx.userId)
    .eq("role", "mosque_admin")
    .eq("is_active", true);

  const adminMosques = (memberships ?? []).map((m) => {
    const mosque = m.mosques as { id: string; name: string; slug: string } | null;
    return {
      id: m.mosque_id,
      name: mosque?.name ?? "Unknown",
      slug: mosque?.slug ?? "",
    };
  });

  const mosqueIds = adminMosques.map((m) => m.id);

  // Fetch subscriptions for all managed mosques
  const { data: subscriptions } = await supabase
    .from("mosque_subscriptions")
    .select("mosque_id, plan_id, status")
    .in("mosque_id", mosqueIds.length > 0 ? mosqueIds : ["none"]);

  const subMap = new Map(
    (subscriptions ?? []).map((s) => [s.mosque_id, s]),
  );

  const hasCommunityPlan = (subscriptions ?? []).some(
    (s) => s.plan_id === "community",
  );

  const planBadgeCls = (planId: string) => {
    if (planId === "community")
      return "bg-accent-subtle text-accent";
    if (planId === "growth")
      return "bg-info-subtle text-info-fg";
    return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        icon={<Building2 className="h-5 w-5" />}
        title={t("manageMosques")}
        breadcrumbs={[
          { href: "/admin", label: t("overview") },
          { label: t("manageMosques") },
        ]}
      />

      {/* Mosque list */}
      <div className="space-y-3">
        {adminMosques.map((mosque) => {
          const sub = subMap.get(mosque.id);
          const isActive = mosque.id === ctx.mosqueId;
          return (
            <div
              key={mosque.id}
              className={`rounded-xl border bg-card p-4 flex flex-wrap items-center justify-between gap-3 ${
                isActive
                  ? "border-accent/60 ring-1 ring-accent/20"
                  : "border-card-border"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-subtle text-accent">
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm truncate">
                      {mosque.name}
                    </span>
                    {isActive && (
                      <span className="text-xs rounded-full bg-accent-subtle text-accent px-2.5 py-0.5 font-semibold">
                        {t("activeMosque")}
                      </span>
                    )}
                    {sub && (
                      <span
                        className={`text-xs rounded-full px-2 py-0.5 font-medium capitalize ${planBadgeCls(sub.plan_id)}`}
                      >
                        {sub.plan_id}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted mt-0.5">/{mosque.slug}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={`./mosques/${mosque.id}/admins`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  {t("manageMosqueAdmins")}
                </a>
                {!isActive && (
                  <MosqueSwitcherForm mosqueId={mosque.id} label={t("switchMosque")} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create new mosque */}
      <section className="space-y-4">
        {hasCommunityPlan ? (
          <CollapsibleAddCard
            buttonLabel={t("createMosque")}
          >
            <FormCard title={t("createMosque")}>
              <ActionForm
                action={createMosque}
                successMessage={t("mosqueCreated")}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label={t("mosqueName")} required>
                    <input name="name" required placeholder="Al-Nour Mosque" className={inputCls} />
                  </FormField>
                  <FormField
                    label={t("mosqueSlug")}
                    required
                    hint="Only lowercase letters, numbers, hyphens"
                  >
                    <input name="slug" required placeholder="al-nour" pattern="[a-z0-9-]+" className={inputCls} />
                  </FormField>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label={t("mosqueTimezone")}>
                    <select name="timezone" defaultValue="Europe/Berlin" className={selectCls}>
                      <option value="Europe/Berlin">Europe/Berlin</option>
                      <option value="Europe/Vienna">Europe/Vienna</option>
                      <option value="Europe/Zurich">Europe/Zurich</option>
                      <option value="Europe/London">Europe/London</option>
                      <option value="Europe/Paris">Europe/Paris</option>
                      <option value="Europe/Amsterdam">Europe/Amsterdam</option>
                      <option value="Europe/Sarajevo">Europe/Sarajevo</option>
                      <option value="Europe/Istanbul">Europe/Istanbul</option>
                      <option value="America/New_York">America/New_York</option>
                      <option value="America/Chicago">America/Chicago</option>
                      <option value="America/Los_Angeles">America/Los_Angeles</option>
                      <option value="Asia/Riyadh">Asia/Riyadh</option>
                      <option value="Asia/Dubai">Asia/Dubai</option>
                    </select>
                  </FormField>
                  <FormField label={t("mosqueState")}>
                    <input name="state" placeholder="Berlin" defaultValue="Berlin" className={inputCls} />
                  </FormField>
                </div>
                <button
                  type="submit"
                  className={buttonVariants({ size: "xl" })}
                >
                  {t("createMosque")}
                </button>
              </ActionForm>
            </FormCard>
          </CollapsibleAddCard>
        ) : (
          <div className="rounded-xl border border-dashed border-card-border bg-card p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-subtle text-accent">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{t("createMosque")}</p>
              <p className="text-xs text-muted mt-0.5">
                {t("communityPlanRequired")}
              </p>
            </div>
            <Link
              href="/admin/settings?tab=billing"
              className={cn(buttonVariants({ size: "sm" }), "shrink-0")}
            >
              {t("upgradePlan")}
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
