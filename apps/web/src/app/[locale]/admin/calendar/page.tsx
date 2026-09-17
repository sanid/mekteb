import { getTranslations } from "next-intl/server";
import { Calendar } from "lucide-react";

import { requireAdmin } from "@/lib/auth";
import { requirePlugin } from "@/lib/plugins";
import { getMosqueConfig } from "@/lib/mosque-config";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { CalendarClient } from "./CalendarClient";

type SearchParams = Promise<{ year?: string }>;

export default async function AdminCalendarPage({ searchParams }: { searchParams: SearchParams }) {
  const { year: yearParam } = await searchParams;
  const ctx = await requireAdmin();
  await requirePlugin(ctx.mosqueId, "calendar", "/admin");
  const { state: mosqueState } = await getMosqueConfig(ctx.mosqueId);
  const supabase = await createClient();
  const t = await getTranslations("Admin");

  const currentYear = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

  const [
    { data: categories },
    { data: schedules },
    { data: sessions },
    { data: holidays },
    { data: groups },
    { data: events },
  ] = await Promise.all([
    supabase
      .from("group_categories")
      .select("id, name, color")
      .eq("mosque_id", ctx.mosqueId)
      .order("name"),
    supabase
      .from("teaching_schedules")
      .select("category_id, group_id, day_of_week, start_time, end_time")
      .eq("mosque_id", ctx.mosqueId),
    supabase
      .from("teaching_sessions")
      .select("id, date, category_id, group_id, start_time, end_time, is_cancelled, notes, groups(id, name, room, group_categories(color))")
      .eq("mosque_id", ctx.mosqueId)
      .gte("date", `${currentYear}-01-01`)
      .lte("date", `${currentYear}-12-31`),
    supabase
      .from("school_holidays")
      .select("id, name, start_date, end_date")
      .eq("state", mosqueState), // Default to Berlin
    supabase
      .from("groups")
      .select("id, name, room, group_categories(color)")
      .eq("mosque_id", ctx.mosqueId)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("calendar_events")
      .select("id, title, description, date, start_time, end_time, visibility")
      .eq("mosque_id", ctx.mosqueId)
      .gte("date", `${currentYear}-01-01`)
      .lte("date", `${currentYear}-12-31`),
  ]);

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        icon={<Calendar className="h-5 w-5" />}
        title={t("calendar")}
        breadcrumbs={[
          { href: "/admin", label: t("overview") },
          { label: t("calendar") },
        ]}
      />

      <CalendarClient
        categories={categories ?? []}
        initialSchedules={schedules ?? []}
        initialSessions={sessions ?? []}
        holidays={holidays ?? []}
        groups={(groups ?? []) as { id: string; name: string; room: string | null; group_categories: { color: string } | null }[]}
        selectedYear={currentYear}
        initialEvents={events ?? []}
      />
    </div>
  );
}
