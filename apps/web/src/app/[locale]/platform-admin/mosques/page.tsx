import { getLocale, getTranslations } from "next-intl/server";
import { Building2 } from "lucide-react";
import { requirePlatformOwner } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/PageHeader";
import { Link } from "@/i18n/routing";
import { formatDateShort } from "@/lib/format";

export default async function PlatformMosquesPage() {
  const locale = await getLocale();
  await requirePlatformOwner();
  const t = await getTranslations("PlatformAdmin");
  const admin = createAdminClient();

  const [{ data: mosques }, { data: subRows }, { data: studentCounts }] = await Promise.all([
    admin
      .from("mosques")
      .select("id, name, slug, timezone, created_at")
      .order("created_at", { ascending: false }),
    admin
      .from("mosque_subscriptions")
      .select("mosque_id, plan_id, status, trial_ends_at, current_period_end"),
    admin
      .from("student_profiles")
      .select("mosque_id")
      .eq("is_active", true),
  ]);

  const subByMosque = Object.fromEntries(
    (subRows ?? []).map((s) => [s.mosque_id, s]),
  );

  const studentsByMosque: Record<string, number> = {};
  for (const s of studentCounts ?? []) {
    studentsByMosque[s.mosque_id] = (studentsByMosque[s.mosque_id] ?? 0) + 1;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        icon={<Building2 className="h-5 w-5" />}
        title={t("mosques")}
        breadcrumbs={[
          { href: "/platform-admin", label: t("platformAdmin") },
          { label: t("mosques") },
        ]}
      />

      <div className="rounded-xl border border-card-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-card-border bg-surface/50 text-xs text-muted">
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-muted">{t("name")}</th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-muted">{t("slug")}</th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-muted">{t("plan")}</th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-muted">{t("status")}</th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-muted">{t("totalStudents")}</th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-muted">{t("trialEnds")}</th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-muted">{t("created")}</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {(mosques ?? []).map((mosque) => {
                const sub = subByMosque[mosque.id];
                const students = studentsByMosque[mosque.id] ?? 0;
                const trialEnd = sub?.trial_ends_at
                  ? formatDateShort(sub.trial_ends_at, locale)
                  : "—";
                return (
                  <tr key={mosque.id} className="hover:bg-accent-subtle/40 transition-colors">
                    <td className="px-5 py-3 font-medium">
                      <Link
                        href={`/platform-admin/mosques/${mosque.id}`}
                        className="hover:text-accent hover:underline transition-colors"
                      >
                        {mosque.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-muted">{mosque.slug}</td>
                    <td className="px-5 py-3 capitalize">{sub?.plan_id ?? "—"}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        sub?.status === "active"    ? "bg-success-subtle text-success-fg" :
                        sub?.status === "trialing"  ? "bg-info-subtle text-info-fg"   :
                        sub?.status === "past_due"  ? "bg-warning-subtle text-warning-fg" :
                        sub?.status === "canceled"  ? "bg-danger-subtle text-danger-fg"       :
                        "bg-card-border text-muted-foreground"
                      }`}>
                        {sub?.status ?? "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3 tabular-nums">{students}</td>
                    <td className="px-5 py-3 text-muted">{trialEnd}</td>
                    <td className="px-5 py-3 text-muted">
                      {formatDateShort(mosque.created_at, locale)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/platform-admin/mosques/${mosque.id}`}
                        className="text-xs text-accent hover:underline"
                      >
                        {t("manage")}
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {(mosques ?? []).length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-muted">
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
