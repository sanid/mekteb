import { ChevronRight, Users, CalendarCheck, BookOpen } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { Link } from "@/i18n/routing";
import { requireTeacher } from "@/lib/auth";
import { getMosqueConfig } from "@/lib/mosque-config";
import { createClient } from "@/lib/supabase/server";
import { DashboardCalendar } from "@/components/DashboardCalendar";
import { PageHeader, SectionHeader } from "@/components/PageHeader";
import { formatDate } from "@/lib/format";
import { emptyCard, listCard } from "@/components/ui/surfaces";
import { PrayerTimesSection } from "@/components/PrayerTimesSection";

export default async function TeacherDashboard() {
  const locale = await getLocale();
  const ctx = await requireTeacher();
  const { state: mosqueState } = await getMosqueConfig(ctx.mosqueId);
  const t = await getTranslations("Teacher");
  const tAdmin = await getTranslations("Admin");
  const tExam = await getTranslations("Examiner");
  const supabase = await createClient();

  const { data: links } = await supabase
    .from("teacher_group_links")
    .select(
      "id, group_id, groups(id, name, description, category_id, group_enrollments(count))",
    )
    .eq("teacher_profile_id", ctx.teacherProfileId)
    .eq("is_active", true);

  const teacherCategoryIds = (links ?? [])
    .map((l) => l.groups?.category_id)
    .filter((id): id is string => !!id);

  // Fetch teaching sessions, school holidays and calendar events
  const [{ data: calendarSessions }, { data: holidays }, { data: events }] = await Promise.all([
    teacherCategoryIds.length > 0
      ? supabase
          .from("teaching_sessions")
          .select("id, date, start_time, end_time, is_cancelled, notes, category_id, group_id, group_categories(name, color), groups(id, name, room, group_categories(name, color))")
          .eq("mosque_id", ctx.mosqueId)
          .in("category_id", teacherCategoryIds)
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

  const groups = (links ?? [])
    .map((l) => l.groups as {
      id: string;
      name: string;
      description: string | null;
      group_enrollments: Array<{ count: number }> | null;
    } | null)
    .filter((g): g is NonNullable<typeof g> => g !== null);

  const groupIds = groups.map((g) => g.id);
  const todayDate = new Date();
  const nextWeekDate = new Date(todayDate);
  nextWeekDate.setDate(todayDate.getDate() + 7);
  const today = todayDate.toISOString().slice(0, 10);
  const nextWeek = nextWeekDate.toISOString().slice(0, 10);

  const [{ data: recentSessions }, { data: upcomingHw }, { data: examResultsRaw }] = await Promise.all([
    ...(groupIds.length
    ? [
        supabase
          .from("attendance_sessions")
          .select("id, session_date, group_id, groups(name)")
          .in("group_id", groupIds)
          .order("session_date", { ascending: false })
          .limit(5),
        supabase
          .from("homework_assignments")
          .select("id, title, due_date, group_id, groups(name)")
          .in("group_id", groupIds)
          .eq("is_published", true)
          .gte("due_date", today)
          .lte("due_date", nextWeek)
          .order("due_date")
          .limit(5),
      ]
    : [Promise.resolve({ data: [] }), Promise.resolve({ data: [] })]),
    // Recent exam results for students this teacher nominated
    supabase
      .from("exam_sessions")
      .select("id, status, summary, exam_date, student_profiles(full_name), exam_requests!inner(requested_by)")
      .eq("exam_requests.requested_by", ctx.teacherProfileId)
      .in("status", ["passed", "failed"])
      .order("exam_date", { ascending: false })
      .limit(5),
  ]);

  const examResults = (examResultsRaw ?? []) as Array<{
    id: string;
    status: string;
    summary: string | null;
    exam_date: string;
    student_profiles: { full_name: string } | null;
  }>;

  type Session = { id: string; session_date: string; group_id: string; groups: { name: string } | null };
  type HwItem = { id: string; title: string; due_date: string | null; group_id: string; groups: { name: string } | null };

  const sessions = (recentSessions ?? []) as Session[];
  const homework = (upcomingHw ?? []) as HwItem[];

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader title={t("welcome")} description={t("welcomeSub")} />

      {/* My groups */}
      <section className="space-y-3">
        <SectionHeader title={t("myGroups")} icon={<Users />} />

        {groups.length === 0 ? (
          <div className={`${emptyCard} flex flex-col items-center gap-3`}>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface text-muted">
              <Users className="h-5 w-5" />
            </div>
            <p>{t("noGroupsAssigned")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {groups.map((g) => {
              const count = g.group_enrollments?.[0]?.count ?? 0;
              return (
                <Link
                  key={g.id}
                  href={`/teacher/groups/${g.id}`}
                  className="group rounded-xl border border-card-border bg-card p-5 transition-all hover:border-accent/40 hover:shadow-elevated"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-subtle text-sm font-semibold text-accent">
                      {g.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate">{g.name}</div>
                      {g.description ? (
                        <div className="text-sm text-muted mt-0.5 line-clamp-2">
                          {g.description}
                        </div>
                      ) : null}
                      <div className="mt-3 flex items-center gap-1.5 text-sm text-muted">
                        <Users className="h-3.5 w-3.5 shrink-0" />
                        <span>{count} {t("studentsCount")}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted shrink-0 mt-0.5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {groupIds.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Recent sessions */}
          <section className="space-y-3">
            <SectionHeader title={t("recentSessions")} icon={<CalendarCheck />} />
            <ul className={listCard}>
              {sessions.length === 0 ? (
                <li className="px-4 py-3.5 text-sm text-muted">{tAdmin("noAttendance")}</li>
              ) : (
                sessions.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium">
                        {formatDate(s.session_date, locale, { weekday: "short", month: "short", day: "numeric" })}
                      </div>
                      <div className="text-xs text-muted truncate">{s.groups?.name}</div>
                    </div>
                    <Link
                      href={`/teacher/groups/${s.group_id}#attendance`}
                      className="shrink-0 text-sm font-medium text-accent hover:underline"
                    >
                      {tAdmin("attendance")}
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </section>

          {/* Homework due this week */}
          <section className="space-y-3">
            <SectionHeader title={t("upcomingHomework")} icon={<BookOpen />} />
            <ul className={listCard}>
              {homework.length === 0 ? (
                <li className="px-4 py-3.5 text-sm text-muted">{tAdmin("noHomework")}</li>
              ) : (
                homework.map((h) => (
                  <li key={h.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{h.title}</div>
                      <div className="text-xs text-muted">{h.groups?.name}</div>
                    </div>
                    {h.due_date ? (
                      <span className="shrink-0 text-xs text-muted whitespace-nowrap">
                        {formatDate(h.due_date, locale, { month: "short", day: "numeric" })}
                      </span>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>
      ) : null}

      {examResults.length > 0 ? (
        <section className="space-y-3">
          <SectionHeader title={t("recentExamResults")} />
          <ul className={listCard}>
            {examResults.map((er) => (
              <li key={er.id} className="px-4 py-3 space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium">
                    {er.student_profiles?.full_name ?? "—"}
                  </div>
                  <span
                    className={`text-xs rounded-full px-2.5 py-0.5 font-semibold ${
                      er.status === "passed"
                        ? "bg-success-subtle text-success-fg"
                        : "bg-danger-subtle text-danger-fg"
                    }`}
                  >
                    {tExam(er.status === "passed" ? "examStatus_passed" : "examStatus_failed")}
                  </span>
                </div>
                {er.summary ? (
                  <div className="text-xs text-muted">
                    <span className="font-medium">{t("examNotes")}: </span>
                    {er.summary}
                  </div>
                ) : null}
                <div className="text-xs text-muted">{formatDate(er.exam_date, locale, { month: "short", day: "numeric", year: "numeric" })}</div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <PrayerTimesSection mosqueId={ctx.mosqueId} />

      <DashboardCalendar
        sessions={calendarSessions ?? []}
        holidays={holidays ?? []}
        events={events ?? []}
        sessionBasePath="/teacher/groups"
      />
    </div>
  );
}
