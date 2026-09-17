import { getLocale, getTranslations } from "next-intl/server";
import { Shield } from "lucide-react";
import { requirePlatformOwner } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/PageHeader";
import { formatDateTime } from "@/lib/format";

export default async function PlatformGdprPage() {
  const locale = await getLocale();
  await requirePlatformOwner();
  const t = await getTranslations("PlatformAdmin");
  const admin = createAdminClient();

  const { data: logs } = await admin
    .from("gdpr_deletion_log")
    .select("*")
    .order("deletion_started_at", { ascending: false });

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        icon={<Shield className="h-5 w-5" />}
        title={t("gdprLog")}
        breadcrumbs={[
          { href: "/platform-admin", label: t("platformAdmin") },
          { label: t("gdprLog") },
        ]}
      />

      <p className="text-sm text-muted-foreground">
        {t("gdprLogDesc")}
      </p>

      <div className="rounded-xl border border-card-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-card-border bg-surface/50 text-xs text-muted">
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-muted">{t("name")}</th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-muted">{t("slug")}</th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-muted">{t("requestedBy")}</th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-muted">{t("deletionStarted")}</th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-muted">{t("deletionCompleted")}</th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-muted">{t("stripeDeleted")}</th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-muted">{t("storageFiles")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {(logs ?? []).map((log) => (
                <tr key={log.id} className="hover:bg-accent-subtle/40">
                  <td className="px-5 py-3 font-medium">{log.mosque_name}</td>
                  <td className="px-5 py-3 font-mono text-xs text-muted">{log.mosque_slug}</td>
                  <td className="px-5 py-3 text-xs">{log.requested_by_email}</td>
                  <td className="px-5 py-3 text-muted text-xs">
                    {formatDateTime(log.deletion_started_at, locale)}
                  </td>
                  <td className="px-5 py-3 text-xs">
                    {log.deletion_completed_at ? (
                      <span className="text-success-fg">
                        {formatDateTime(log.deletion_completed_at, locale)}
                      </span>
                    ) : (
                      <span className="text-warning-fg">{t("pending")}</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center">
                    {log.stripe_customer_deleted ? "✓" : "—"}
                  </td>
                  <td className="px-5 py-3 tabular-nums">{log.storage_files_deleted}</td>
                </tr>
              ))}
              {(logs ?? []).length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-muted text-sm">
                    {t("noGdprLogs")}
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
