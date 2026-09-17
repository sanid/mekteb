import { getLocale, getTranslations } from "next-intl/server";
import { Clock, ChevronLeft, ChevronRight, FileDown } from "lucide-react";

import { Link } from "@/i18n/routing";
import { requireAdmin } from "@/lib/auth";
import { requirePlugin } from "@/lib/plugins";
import { createClient } from "@/lib/supabase/server";
import { PRAYER_METHODS, PRAYER_ORDER, type PrayerMethod } from "@/lib/prayer-times";
import { fetchPrayerCalendarByLocation } from "@/lib/aladhan";
import { PageHeader } from "@/components/PageHeader";
import { PrayerTimesSection } from "@/components/PrayerTimesSection";
import { buttonVariants } from "@/components/ui/button";
import { dateFormatLocale } from "@/lib/format";

const VALID_METHODS = new Set(PRAYER_METHODS.map((m) => m.id));

type PageProps = {
  searchParams: Promise<{ year?: string; month?: string }>;
};

export default async function AdminPrayerTimesPage({ searchParams }: PageProps) {
  const ctx = await requireAdmin();
  await requirePlugin(ctx.mosqueId, "prayer_times", "/admin");

  const t = await getTranslations("Admin");
  const tp = await getTranslations("Prayer");
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: mosque } = await supabase
    .from("mosques")
    .select("prayer_location, prayer_method")
    .eq("id", ctx.mosqueId)
    .maybeSingle();

  const header = (
    <PageHeader
      icon={<Clock className="h-5 w-5" />}
      title={t("prayerTimes")}
      description={mosque?.prayer_location ?? undefined}
      breadcrumbs={[
        { href: "/admin", label: t("overview") },
        { label: t("prayerTimes") },
      ]}
      actions={
        mosque?.prayer_location ? (
          <a
            href="/admin/prayer-times/pdf"
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ size: "sm" })}
          >
            <FileDown className="h-3.5 w-3.5" />
            {t("prayerCalendarPdf")}
          </a>
        ) : undefined
      }
    />
  );

  // Location is configured under Settings → General; without it there is
  // nothing to look up.
  if (!mosque?.prayer_location) {
    return (
      <div className="space-y-8 max-w-4xl">
        {header}
        <div className="rounded-xl border border-dashed border-card-border bg-card/30 p-10 text-center">
          <p className="text-sm text-muted">{t("prayerNotConfigured")}</p>
          <Link
            href="/admin/settings"
            className={`${buttonVariants({ size: "sm" })} mt-4 inline-flex`}
          >
            {t("prayerConfigure")}
          </Link>
        </div>
      </div>
    );
  }

  const method = (
    mosque.prayer_method && VALID_METHODS.has(mosque.prayer_method as PrayerMethod)
      ? mosque.prayer_method
      : "MWL"
  ) as PrayerMethod;

  const { year: yearParam, month: monthParam } = await searchParams;
  const now = new Date();
  const year = Number.parseInt(yearParam ?? "", 10) || now.getFullYear();
  const month = Number.parseInt(monthParam ?? "", 10) || now.getMonth() + 1;

  const calendar = await fetchPrayerCalendarByLocation(mosque.prayer_location, method, year, month);

  const dateLocale = dateFormatLocale(locale);
  const monthLabel = new Intl.DateTimeFormat(dateLocale, {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));

  const prev = new Date(year, month - 2, 1);
  const next = new Date(year, month, 1);
  const monthHref = (d: Date) =>
    `/admin/prayer-times?year=${d.getFullYear()}&month=${d.getMonth() + 1}`;

  const todayKey = now.toDateString();

  return (
    <div className="space-y-8 max-w-4xl">
      {header}

      <PrayerTimesSection mosqueId={ctx.mosqueId} />

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">{monthLabel}</h2>
          <div className="flex items-center gap-1">
            <Link
              href={monthHref(prev)}
              aria-label={t("prayerPrevMonth")}
              className="rounded-lg border border-card-border p-2 text-muted-foreground transition-colors hover:border-accent/40 hover:text-accent"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <Link
              href={monthHref(next)}
              aria-label={t("prayerNextMonth")}
              className="rounded-lg border border-card-border p-2 text-muted-foreground transition-colors hover:border-accent/40 hover:text-accent"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {!calendar ? (
          <div className="rounded-xl border border-dashed border-card-border bg-card/30 p-10 text-center text-sm text-muted">
            {t("prayerFetchFailed")}
          </div>
        ) : (
          <div className="rounded-xl border border-card-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface text-xs text-muted">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium">
                      {t("prayerCalendarDay")}
                    </th>
                    {PRAYER_ORDER.map((key) => (
                      <th key={key} className="px-3 py-2.5 text-left font-medium">
                        {tp(key)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {calendar.days.map((day) => {
                    const isToday = day.date.toDateString() === todayKey;
                    return (
                      <tr
                        key={day.date.toISOString()}
                        className={isToday ? "bg-accent-subtle" : undefined}
                      >
                        <td
                          className={`px-4 py-2 whitespace-nowrap ${isToday ? "font-semibold text-accent" : ""}`}
                        >
                          {new Intl.DateTimeFormat(dateLocale, {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          }).format(day.date)}
                        </td>
                        {PRAYER_ORDER.map((key) => (
                          <td key={key} className="px-3 py-2 tabular-nums text-muted-foreground">
                            {day.times[key]}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p className="text-xs text-muted">
          {t("timezone")}: {calendar?.timezone ?? "—"}
        </p>
      </section>
    </div>
  );
}
