import { getLocale, getTranslations } from "next-intl/server";
import { CreditCard, Check } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/PageHeader";
import { CancelButton } from "./CancelButton";
import { PlanActions } from "./PlanActions";
import { formatDateShort } from "@/lib/format";

const STATUS_COLORS: Record<string, string> = {
  active:    "bg-success-subtle text-success-fg",
  trialing:  "bg-info-subtle text-info-fg",
  past_due:  "bg-warning-subtle text-warning-fg",
  suspended: "bg-warning-subtle text-warning-fg",
  canceled:  "bg-danger-subtle text-danger-fg",
};

export default async function AdminBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string }>;
}) {
  const locale = await getLocale();
  const ctx = await requireAdmin();
  const t   = await getTranslations("Billing");
  const sp  = await searchParams;
  const admin = createAdminClient();

  const [{ data: sub }, { data: plans }] = await Promise.all([
    admin
      .from("mosque_subscriptions")
      .select("plan_id, status, trial_ends_at, current_period_end, cancel_at_period_end, cancels_at, pending_plan_id, stripe_subscription_id")
      .eq("mosque_id", ctx.mosqueId)
      .maybeSingle(),
    admin.from("plans").select("id, name, price_monthly_eur, features, max_students").order("sort_order"),
  ]);

  const currentPlanId = sub?.plan_id ?? "starter";
  const plansList = plans ?? [];
  const currentPrice =
    plansList.find((p) => p.id === currentPlanId)?.price_monthly_eur ?? 0;
  // A live paid subscription: checkout/switch decisions depend on it.
  const hasPaidSub =
    !!sub?.stripe_subscription_id &&
    sub.status !== "canceled" &&
    sub.status !== "suspended";

  function formatPrice(cents: number) {
    if (cents === 0) return t("free");
    return `€${cents / 100}`;
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        icon={<CreditCard className="h-5 w-5" />}
        title={t("billing")}
        breadcrumbs={[
          { href: "/admin", label: t("overview") },
          { href: "/admin/settings", label: t("settings") },
          { label: t("billing") },
        ]}
      />

      {sp.success && (
        <div className="rounded-xl border border-success/30 bg-success-subtle px-4 py-3 text-sm text-success-fg">
          {t("upgradeSuccess")}
        </div>
      )}
      {sp.canceled && (
        <div className="rounded-xl border border-card-border bg-card px-4 py-3 text-sm text-muted">
          {t("upgradeCanceled")}
        </div>
      )}

      {/* Current plan */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">{t("currentPlan")}</h2>
        <div className="rounded-xl border border-card-border bg-card p-5 flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <p className="font-semibold capitalize">{currentPlanId}</p>
            {sub?.status && (
              <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[sub.status] ?? ""}`}>
                {t(`status_${sub.status}` as Parameters<typeof t>[0], { defaultValue: sub.status })}
              </span>
            )}
            {sub?.trial_ends_at && sub.status === "trialing" && (
              <p className="text-xs text-muted">
                {t("trialEnds", { date: formatDateShort(sub.trial_ends_at, locale) })}
              </p>
            )}
            {/* Cancel / reactivate — only for paid active plans. Cancelling is
                the downgrade-to-free path: it records `pending_plan_id` and the
                webhook applies it when the period ends. */}
            {sub?.stripe_subscription_id && (sub.status === "active" || sub.status === "trialing") && (
              <CancelButton
                cancelsAt={(sub as { cancels_at?: string | null }).cancels_at ?? null}
                downgradeToFree={(sub as { pending_plan_id?: string | null }).pending_plan_id === "starter"}
              />
            )}
          </div>
        </div>
      </section>

      {/* Plan cards */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">{t("availablePlans")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(plansList).map((plan) => {
            const isCurrent = plan.id === currentPlanId;
            const features = Array.isArray(plan.features) ? plan.features as string[] : [];
            const isFreePlan = plan.price_monthly_eur === 0;
            const isUpgrade = !isFreePlan && plan.price_monthly_eur > currentPrice;
            return (
              <div
                key={plan.id}
                className={`rounded-xl border p-5 flex flex-col gap-4 ${
                  isCurrent ? "border-accent ring-1 ring-accent" : "border-card-border bg-card"
                }`}
              >
                <div>
                  <p className="font-semibold capitalize">{plan.name}</p>
                  <p className="text-2xl font-semibold mt-1">
                    {formatPrice(plan.price_monthly_eur)}
                    {plan.price_monthly_eur > 0 && (
                      <span className="text-sm font-normal text-muted">/mo</span>
                    )}
                  </p>
                  {plan.max_students && (
                    <p className="text-xs text-muted mt-0.5">
                      {t("upToStudents", { n: plan.max_students })}
                    </p>
                  )}
                </div>
                <ul className="flex-1 space-y-1.5">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-1.5 text-xs">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                      {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <span className="rounded-lg border border-accent/40 px-3 py-2 text-xs font-semibold text-accent text-center">
                    {t("currentPlanBadge")}
                  </span>
                ) : (
                  <PlanActions
                    planId={plan.id}
                    planName={plan.name}
                    isFree={isFreePlan}
                    hasPaidSub={hasPaidSub}
                    isUpgrade={isUpgrade}
                    href={`/admin/settings/billing/checkout?plan=${plan.id}`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
