import { BookOpen, ChevronRight, CalendarCheck, MapPin } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { requireStudent } from "@/lib/auth";
import { getMosqueConfig } from "@/lib/mosque-config";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/routing";
import { DashboardCalendar } from "@/components/DashboardCalendar";
import { formatDate } from "@/lib/format";
import { listCard } from "@/components/ui/surfaces";
import { PrayerTimesSection } from "@/components/PrayerTimesSection";

function urgencyBadge(dueDate: string | null) {
  if (!dueDate) return null;
  const diff = new Date(dueDate).getTime() - Date.now();
  if (diff < 0) return { label: "overdue", cls: "bg-danger-subtle text-danger-fg" };
  if (diff < 3 * 24 * 60 * 60 * 1000) return { label: "soon", cls: "bg-warning-subtle text-warning-fg" };
  return null;
}

export default async function StudentDashboardPage() {
  const locale = await getLocale();
  const ctx = await requireStudent();
  const { state: mosqueState } = await getMosqueConfig(ctx.mosqueId);
  const t = await getTranslations("Student");
  const supabase = await createClient();

  const [{ data: enrollments }, { data: branding }] = await Promise.all([
    supabase
      .from("group_enrollments")
      .select("id, group_id, groups(id, name, description, room, category_id)")
      .eq("student_profile_id", ctx.studentProfileId)
      .eq("is_active", true)
      .order("enrolled_at", { ascending: false }),
    supabase
      .from("mosque_branding")
      .select("welcome_message, contact_address, contact_phone, contact_email, contact_website")
      .eq("mosque_id", ctx.mosqueId)
      .maybeSingle(),
  ]);

  const enrolledGroupIds = (enrollments ?? []).map((e) => e.group_id).filter(Boolean);
  const studentCategoryIds = (enrollments ?? [])
    .map((e) => e.groups?.category_id)
    .filter((id): id is string => !!id);

  const [{ data: recentHomeworkRaw }, { data: attendanceRaw }] = await Promise.all([
    enrolledGroupIds.length > 0
      ? supabase
          .from("homework_assignments")
          .select("id, title, due_date, group_id, audience, groups(name), homework_targets(student_profile_id)")
          .eq("mosque_id", ctx.mosqueId)
          .eq("is_published", true)
          .in("group_id", enrolledGroupIds)
          .order("due_date", { ascending: true })
          .limit(20)
      : Promise.resolve({ data: [] as never[] }),
    supabase
      .from("attendance_records")
      .select("id, status")
      .eq("student_profile_id", ctx.studentProfileId)
      .limit(30),
  ]);

  // Filter: group-wide homework is visible to all, individual homework only if student is a target
  type HwRow = { id: string; title: string; due_date: string | null; group_id: string; audience: string; groups: { name: string } | null; homework_targets: Array<{ student_profile_id: string }> };
  const recentHomework = (recentHomeworkRaw as HwRow[] ?? []).filter(
    (h) =>
      h.audience === "group" ||
      (h.homework_targets ?? []).some((t) => t.student_profile_id === ctx.studentProfileId),
  ).slice(0, 5);

  // Fetch teaching sessions, school holidays and calendar events
  const [{ data: calendarSessions }, { data: holidays }, { data: events }] = await Promise.all([
    studentCategoryIds.length > 0
      ? supabase
          .from("teaching_sessions")
          .select("id, date, start_time, end_time, is_cancelled, notes, category_id, group_id, group_categories(name, color), groups(id, name, room, group_categories(name, color))")
          .eq("mosque_id", ctx.mosqueId)
          .in("category_id", studentCategoryIds)
          .order("date", { ascending: true })
      : Promise.resolve({ data: [] }),
    supabase
      .from("school_holidays")
      .select("id, name, start_date, end_date")
      .eq("state", mosqueState),
    supabase
      .from("calendar_events")
      .select("id, title, description, date, start_time, end_time, visibility")
      .eq("mosque_id", ctx.mosqueId),
  ]);

  const groups = (enrollments ?? []).map((e) => ({
    id: (e.groups as { id: string; name: string; description: string | null; room: string | null } | null)?.id ?? "",
    name: (e.groups as { id: string; name: string; description: string | null; room: string | null } | null)?.name ?? "",
    description: (e.groups as { id: string; name: string; description: string | null; room: string | null } | null)?.description ?? null,
    room: (e.groups as { id: string; name: string; description: string | null; room: string | null } | null)?.room ?? null,
  })).filter((g) => g.id);

  const { data: confirmedExamRaw } = await supabase
    .from("exam_sessions")
    .select("id, exam_date")
    .eq("student_profile_id", ctx.studentProfileId)
    .eq("schedule_status", "confirmed")
    .order("exam_date", { ascending: true })
    .limit(1)
    .maybeSingle();
  const confirmedExam = confirmedExamRaw as { id: string; exam_date: string } | null;

  const allRecords = attendanceRaw ?? [];
  const presentCount = allRecords.filter((r) => r.status === "present" || r.status === "late").length;
  const attendanceRate = allRecords.length > 0 ? Math.round((presentCount / allRecords.length) * 100) : null;

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Welcome */}
      <div className="rounded-xl border border-card-border bg-card p-6">
        <p className="text-sm text-muted">{t("welcomeSub")}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {t("welcome")}, <span className="text-accent">{ctx.fullName}</span>
        </h1>
        <p className="mt-1 text-sm text-muted">{ctx.mosqueName}</p>
        {branding?.welcome_message && (
          <p className="mt-2 text-sm text-foreground/80 whitespace-pre-wrap">{branding.welcome_message}</p>
        )}

        {/* Quick attendance summary */}
        {attendanceRate !== null ? (
          <div className="mt-4 flex items-center gap-2 w-fit rounded-full border border-card-border bg-background px-3 py-1.5">
            <CalendarCheck className="h-3.5 w-3.5 text-accent shrink-0" />
            <span className="text-xs font-medium">
              {t("attendanceRate")}: <span className="text-accent">{attendanceRate}%</span>
            </span>
            <span className="text-xs text-muted">({allRecords.length} {t("sessions")})</span>
          </div>
        ) : null}
      </div>

      {(branding?.contact_address || branding?.contact_phone || branding?.contact_email || branding?.contact_website) && (
        <div className="rounded-xl border border-card-border bg-card px-4 py-3 flex flex-wrap gap-x-6 gap-y-1.5 text-sm">
          {branding.contact_address && <span className="text-muted">{branding.contact_address}</span>}
          {branding.contact_phone && <a href={`tel:${branding.contact_phone}`} className="text-accent hover:underline">{branding.contact_phone}</a>}
          {branding.contact_email && <a href={`mailto:${branding.contact_email}`} className="text-accent hover:underline">{branding.contact_email}</a>}
          {branding.contact_website && <a href={branding.contact_website} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">{branding.contact_website.replace(/^https?:\/\//, "")}</a>}
        </div>
      )}

      {confirmedExam ? (
        <div className="rounded-xl border border-card-border bg-card p-4 text-sm">
          <strong>{t("examConfirmed")}:</strong> {confirmedExam.exam_date}
        </div>
      ) : null}

      {/* Enrolled groups */}
      {groups.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">{t("myGroups")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {groups.map((g) => (
              <Link key={g.id} href={`/student/groups/${g.id}`} className="rounded-xl border border-card-border bg-card p-4 hover:border-accent/50 hover:bg-accent-subtle transition-colors block">
                <div className="font-medium text-sm">{g.name}</div>
                {g.description ? (
                  <p className="mt-0.5 text-xs text-muted line-clamp-2">{g.description}</p>
                ) : null}
                {g.room ? (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {g.room}
                  </p>
                ) : null}
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <p className="text-sm text-muted">{t("noGroupsEnrolled")}</p>
      )}

      {/* Upcoming homework */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{t("upcomingHomework")}</h2>
          <Link href="/student/homework" className="flex items-center gap-0.5 text-sm text-accent hover:underline">
            {t("viewAll")}
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {(recentHomework ?? []).length > 0 ? (
          <ul className={listCard}>
            {(recentHomework ?? []).map((h) => {
              const badge = urgencyBadge(h.due_date);
              return (
                <li key={h.id} className="p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-0.5">
                    <div className="font-medium text-sm truncate">{h.title}</div>
                    <div className="flex items-center gap-2 text-xs text-muted">
                      <BookOpen className="h-3 w-3 shrink-0" />
                      <span>{(h.groups as { name: string } | null)?.name}</span>
                      {h.due_date ? (
                        <span>{t("dueDate")}: {formatDate(h.due_date, locale, { month: "short", day: "numeric" })}</span>
                      ) : null}
                    </div>
                  </div>
                  {badge ? (
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.cls}`}>
                      {badge.label === "overdue" ? t("overdue") : t("dueSoon")}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted">{t("noHomework")}</p>
        )}
      </section>

      <PrayerTimesSection mosqueId={ctx.mosqueId} />

      <DashboardCalendar
        sessions={calendarSessions ?? []}
        holidays={holidays ?? []}
        events={events ?? []}
      />
    </div>
  );
}
