import { getLocale, getTranslations } from "next-intl/server";
import { Building2, Users, CreditCard, TrendingUp } from "lucide-react";
import { requirePlatformOwner } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/PageHeader";
import { formatDateShort } from "@/lib/format";

export default async function PlatformAdminPage() {
  const locale = await getLocale();
  await requirePlatformOwner();
  const t = await getTranslations("PlatformAdmin");
  const admin = createAdminClient();

  const [
    { count: totalMosques },
    { data: subscriptions },
    { count: totalStudents },
  ] = await Promise.all([
    admin.from("mosques").select("id", { count: "exact", head: true }),
    admin.from("mosque_subscriptions").select("status, plan_id, mosque_id"),
    admin.from("student_profiles").select("id", { count: "exact", head: true }).eq("is_active", true),
  ]);

  const trialing = (subscriptions ?? []).filter((s) => s.status === "trialing").length;
  const active   = (subscriptions ?? []).filter((s) => s.status === "active").length;
  const paying   = (subscriptions ?? []).filter((s) => s.status === "active" && s.plan_id !== "starter").length;

  const stats = [
    { label: t("totalMosques"),   value: totalMosques ?? 0,  icon: <Building2 className="h-5 w-5" /> },
    { label: t("activeTrials"),   value: trialing,            icon: <TrendingUp className="h-5 w-5" /> },
    { label: t("paying"),         value: paying,              icon: <CreditCard className="h-5 w-5" /> },
    { label: t("totalStudents"),  value: totalStudents ?? 0,  icon: <Users className="h-5 w-5" /> },
  ];

  // Load mosque list with subscription + student count
  const { data: mosques } = await admin
    .from("mosques")
    .select("id, name, slug, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: subRows } = await admin
    .from("mosque_subscriptions")
    .select("mosque_id, plan_id, status, trial_ends_at");

  const subByMosque = Object.fromEntries(
    (subRows ?? []).map((s) => [s.mosque_id, s]),
  );

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        icon={<Building2 className="h-5 w-5" />}
        title={t("overview")}
        breadcrumbs={[{ label: t("platformAdmin") }, { label: t("overview") }]}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-card-border bg-card p-5">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              {s.icon}
              <span className="text-xs font-medium">{s.label}</span>
            </div>
            <p className="text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Mosques table */}
      <div className="rounded-xl border border-card-border overflow-hidden">
        <div className="px-5 py-4 border-b border-card-border bg-card">
          <h2 className="font-semibold">{t("allMosques")}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-card-border bg-surface/50 text-xs text-muted">
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-muted">{t("name")}</th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-muted">{t("slug")}</th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-muted">{t("plan")}</th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-muted">{t("status")}</th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-muted">{t("created")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {(mosques ?? []).map((mosque) => {
                const sub = subByMosque[mosque.id];
                return (
                  <tr key={mosque.id} className="hover:bg-accent-subtle/40 transition-colors">
                    <td className="px-5 py-3 font-medium">{mosque.name}</td>
                    <td className="px-5 py-3 font-mono text-xs text-muted">{mosque.slug}</td>
                    <td className="px-5 py-3 capitalize">{sub?.plan_id ?? "—"}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        sub?.status === "active"   ? "bg-success-subtle text-success-fg" :
                        sub?.status === "trialing" ? "bg-info-subtle text-info-fg"  :
                        sub?.status === "canceled" ? "bg-danger-subtle text-danger-fg"      :
                        "bg-card-border text-muted-foreground"
                      }`}>
                        {sub?.status ?? "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted">
                      {formatDateShort(mosque.created_at, locale)}
                    </td>
                  </tr>
                );
              })}
              {(mosques ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-muted text-sm">
                    {t("noMosques")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
