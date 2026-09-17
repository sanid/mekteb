import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Building2 } from "lucide-react";
import { requirePlatformOwner } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { SubscriptionActions, DeleteMosqueSection } from "./MosqueActions";
import { updateMosque, setPlan } from "./actions";
import { formatDateShort } from "@/lib/format";

const TIMEZONES = [
  "Europe/Berlin", "Europe/Vienna", "Europe/Zurich", "Europe/London",
  "Europe/Istanbul", "Europe/Sarajevo", "America/New_York",
  "America/Chicago", "America/Los_Angeles", "Asia/Dubai", "Asia/Riyadh",
];

const STATUS_COLORS: Record<string, string> = {
  active:    "bg-success-subtle text-success-fg",
  trialing:  "bg-info-subtle text-info-fg",
  past_due:  "bg-warning-subtle text-warning-fg",
  suspended: "bg-warning-subtle text-warning-fg",
  canceled:  "bg-danger-subtle text-danger-fg",
};

export default async function MosqueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const locale = await getLocale();
  await requirePlatformOwner();
  const { id } = await params;
  const t = await getTranslations("PlatformAdmin");
  const admin = createAdminClient();

  const [{ data: mosque }, { data: sub }, { data: plans }, { count: studentCount }, { count: memberCount }] =
    await Promise.all([
      admin.from("mosques").select("id, name, slug, timezone, created_at").eq("id", id).maybeSingle(),
      admin.from("mosque_subscriptions").select("plan_id, status, trial_ends_at, stripe_customer_id, stripe_subscription_id").eq("mosque_id", id).maybeSingle(),
      admin.from("plans").select("id, name").order("sort_order"),
      admin.from("student_profiles").select("id", { count: "exact", head: true }).eq("mosque_id", id).eq("is_active", true),
      admin.from("memberships").select("id", { count: "exact", head: true }).eq("mosque_id", id).eq("is_active", true),
    ]);

  if (!mosque) notFound();

  const fieldClass = "mt-1 block w-full rounded-lg border border-card-border bg-background px-3.5 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/20";
  const labelClass = "block text-sm font-medium";

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        icon={<Building2 className="h-5 w-5" />}
        title={mosque.name}
        breadcrumbs={[
          { href: "/platform-admin", label: t("platformAdmin") },
          { href: "/platform-admin/mosques", label: t("mosques") },
          { label: mosque.name },
        ]}
      />

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t("totalStudents"), value: studentCount ?? 0 },
          { label: t("members"), value: memberCount ?? 0 },
          { label: t("created"), value: formatDateShort(mosque.created_at, locale) },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-card-border bg-card p-5">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Edit mosque */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">{t("editMosque")}</h2>
        <ActionForm
          action={updateMosque}
          successMessage={t("mosqueUpdated")}
          resetOnSuccess={false}
          className="rounded-xl border border-card-border bg-card p-5 space-y-4"
        >
          <input type="hidden" name="mosque_id" value={mosque.id} />
          <label className={labelClass}>
            {t("name")}
            <input name="name" required defaultValue={mosque.name} className={fieldClass} />
          </label>
          <label className={labelClass}>
            {t("slug")}
            <input name="slug" required defaultValue={mosque.slug} className={fieldClass} />
            <span className="text-xs text-muted mt-1 block">{mosque.slug}.mekteb.de</span>
          </label>
          <label className={labelClass}>
            {t("timezone")}
            <select name="timezone" defaultValue={mosque.timezone ?? "Europe/Berlin"} className={fieldClass}>
              {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </label>
          <SubmitButton>{t("save")}</SubmitButton>
        </ActionForm>
      </section>

      {/* Subscription */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">{t("subscription")}</h2>
        <div className="rounded-xl border border-card-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[sub?.status ?? ""] ?? "bg-card-border text-muted-foreground"}`}>
              {sub?.status ?? "none"}
            </span>
            {sub?.trial_ends_at && (
              <span className="text-xs text-muted">
                Trial ends {formatDateShort(sub.trial_ends_at, locale)}
              </span>
            )}
          </div>

          {/* Change plan */}
          <ActionForm
            action={setPlan}
            successMessage={t("planUpdated")}
            resetOnSuccess={false}
            className="flex items-end gap-3"
          >
            <input type="hidden" name="mosque_id" value={mosque.id} />
            <label className="flex-1">
              <span className="text-xs font-medium text-muted-foreground">{t("plan")}</span>
              <select name="plan_id" defaultValue={sub?.plan_id ?? "starter"} className={fieldClass}>
                {(plans ?? []).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
            <SubmitButton variant="secondary">{t("save")}</SubmitButton>
          </ActionForm>

          {/* Status actions */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">{t("setStatus")}</p>
            <SubscriptionActions mosqueId={mosque.id} currentStatus={sub?.status ?? ""} />
          </div>

          {/* Stripe info */}
          {(sub?.stripe_customer_id || sub?.stripe_subscription_id) && (
            <div className="pt-3 border-t border-card-border space-y-1 text-xs text-muted font-mono">
              {sub.stripe_customer_id && <p>{t("stripeCustomer")}: {sub.stripe_customer_id}</p>}
              {sub.stripe_subscription_id && <p>{t("stripeSubscription")}: {sub.stripe_subscription_id}</p>}
            </div>
          )}
        </div>
      </section>

      {/* Danger zone */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-danger-fg">{t("dangerZone")}</h2>
        <DeleteMosqueSection mosqueId={mosque.id} mosqueName={mosque.name} />
      </section>
    </div>
  );
}
