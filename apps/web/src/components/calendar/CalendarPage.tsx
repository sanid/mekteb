import { getTranslations } from "next-intl/server";

import {
  addDays,
  isoDate,
  loadCalendarWeek,
  startOfWeek,
  type CalendarRole,
  type CalendarScope,
} from "@/lib/calendar-data";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { WeekCalendar } from "./WeekCalendar";

/**
 * The calendar page body, shared by all four portals.
 *
 * Each portal keeps its own route (its layout resolves the role and guards
 * access), but the page itself differs only by who is asking — so it lives
 * here rather than four times over.
 */
export type CalendarSearchParams = Promise<{ week?: string; scope?: string }>;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function CalendarPage({
  userId,
  mosqueId,
  role,
  searchParams,
  breadcrumbRoot,
}: {
  userId: string;
  mosqueId: string;
  role: CalendarRole;
  searchParams: CalendarSearchParams;
  /** The portal's overview link, for the breadcrumb. */
  breadcrumbRoot: { href: string; label: string };
}) {
  const { week, scope: scopeParam } = await searchParams;
  const t = await getTranslations("Calendar");

  // An unparseable `?week=` falls back to this week rather than erroring: the
  // parameter is user-visible and someone will eventually hand-edit it.
  const monday =
    week && ISO_DATE.test(week) && !Number.isNaN(Date.parse(week))
      ? startOfWeek(new Date(`${week}T00:00:00`))
      : startOfWeek(new Date());

  const scope: CalendarScope = scopeParam === "mosque" ? "mosque" : "mine";

  const supabase = await createClient();
  const data = await loadCalendarWeek({
    supabase,
    userId,
    mosqueId,
    role,
    from: isoDate(monday),
    to: isoDate(addDays(monday, 6)),
    scope,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        breadcrumbs={[breadcrumbRoot, { label: t("title") }]}
      />
      <WeekCalendar week={data} scope={scope} weekStart={isoDate(monday)} />
    </div>
  );
}
