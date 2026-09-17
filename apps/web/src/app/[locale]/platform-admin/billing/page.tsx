import { getLocale, getTranslations } from "next-intl/server";
import { CreditCard } from "lucide-react";
import { requirePlatformOwner } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/PageHeader";
import { formatDateShort } from "@/lib/format";

export default async function PlatformBillingPage() {
  const locale = await getLocale();
  await requirePlatformOwner();
  const t = await getTranslations("PlatformAdmin");
  const admin = createAdminClient();

  const { data: subs } = await admin
    .from("mosque_subscriptions")
    .select("mosque_id, plan_id, status, trial_ends_at, current_period_end, stripe_customer_id, mosques(name, slug)")
    .order("plan_id");

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        icon={<CreditCard className="h-5 w-5" />}
        title={t("billing")}
        breadcrumbs={[
          { href: "/platform-admin", label: t("platformAdmin") },
          { label: t("billing") },
        ]}
      />

      <div className="rounded-xl border border-card-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-card-border bg-surface/50 text-xs text-muted">
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-muted">{t("name")}</th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-muted">{t("plan")}</th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-muted">{t("status")}</th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-muted">{t("trialEnds")}</th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-muted">{t("stripeCustomer")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {(subs ?? []).map((sub) => {
                const mosque = sub.mosques as { name: string; slug: string } | null;
                return (
                  <tr key={sub.mosque_id} className="hover:bg-accent-subtle/40 transition-colors">
                    <td className="px-5 py-3 font-medium">{mosque?.name ?? "—"}</td>
                    <td className="px-5 py-3 capitalize">{sub.plan_id}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        sub.status === "active"   ? "bg-success-subtle text-success-fg" :
                        sub.status === "trialing" ? "bg-info-subtle text-info-fg"   :
                        sub.status === "past_due" ? "bg-warning-subtle text-warning-fg" :
                        "bg-card-border text-muted-foreground"
                      }`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted">
                      {sub.trial_ends_at ? formatDateShort(sub.trial_ends_at, locale) : "—"}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-muted">
                      {sub.stripe_customer_id ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
