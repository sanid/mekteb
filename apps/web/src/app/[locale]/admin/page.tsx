import { Users, GraduationCap, BookOpen, Heart, TrendingUp, CheckSquare, Plus, BarChart3, Trophy, ClipboardList, AlertTriangle } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { Link } from "@/i18n/routing";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PrayerTimesSection } from "@/components/PrayerTimesSection";
import { getMosqueConfig } from "@/lib/mosque-config";
import { DashboardCalendar } from "@/components/DashboardCalendar";
import { PageHeader } from "@/components/PageHeader";
import { formatDate } from "@/lib/format";
import { listCard } from "@/components/ui/surfaces";

export default async function AdminOverview() {
  const ctx = await requireAdmin();
  const supabase = await createClient();
  const t = await getTranslations("Admin");
  const locale = await getLocale();

  const [
    mosqueConfig,
    groups,
    students,
    teachers,
    parents,
    examSessions,
    totalLessons,
    allGroupsWithStats,
    calendarSessionsData,
    calendarEventsData,
  ] = await Promise.all([
    getMosqueConfig(ctx.mosqueId),
    supabase.from("groups").select("*", { count: "exact", head: true }).eq("mosque_id", ctx.mosqueId),
    supabase.from("student_profiles").select("*", { count: "exact", head: true }).eq("mosque_id", ctx.mosqueId),
    supabase.from("teacher_profiles").select("*", { count: "exact", head: true }).eq("mosque_id", ctx.mosqueId),
    supabase.from("parent_profiles").select("*", { count: "exact", head: true }).eq("mosque_id", ctx.mosqueId),
    supabase
      .from("exam_sessions")
      .select("status")
      .eq("mosque_id", ctx.mosqueId)
      .in("status", ["passed", "failed"]),
    supabase.from("lessons").select("*", { count: "exact", head: true }).eq("mosque_id", ctx.mosqueId),
    supabase
      .from("groups")
      .select("id, name, group_enrollments!group_enrollments_group_id_fkey(student_profile_id)")
      .eq("mosque_id", ctx.mosqueId)
      .eq("is_active", true),
    supabase
      .from("teaching_sessions")
      .select("id, date, start_time, end_time, is_cancelled, notes, category_id, group_id, group_categories(name, color), groups(id, name, group_categories(name, color))")
      .eq("mosque_id", ctx.mosqueId)
      .order("date", { ascending: true }),
    supabase
      .from("calendar_events")
      .select("id, title, description, date, start_time, end_time, visibility")
      .eq("mosque_id", ctx.mosqueId),
  ]);

  const since = mosqueConfig.schoolYearStart;
  const mosqueState = mosqueConfig.state;

  const [
    attendance,
    hwTotal,
    hwAck,
    lessonCompletions,
    holidaysData,
  ] = await Promise.all([
    supabase
      .from("attendance_records")
      .select("status, attendance_sessions!inner(session_date, mosque_id)")
      .eq("attendance_sessions.mosque_id", ctx.mosqueId)
      .gte("attendance_sessions.session_date", since),
    supabase.from("homework_assignments").select("*", { count: "exact", head: true }).eq("mosque_id", ctx.mosqueId).eq("is_published", true).gte("created_at", since),
    supabase.from("homework_submissions").select("*", { count: "exact", head: true }).eq("mosque_id", ctx.mosqueId).gte("acknowledged_at", since),
    supabase.from("lesson_completions").select("*", { count: "exact", head: true }).eq("mosque_id", ctx.mosqueId).gte("created_at", since),
    supabase
      .from("school_holidays")
      .select("id, name, start_date, end_date")
      .eq("state", mosqueState),
  ]);

  const records = attendance.data ?? [];
  const presentCount = records.filter((r) => r.status === "present" || r.status === "late").length;
  const attendanceRate = records.length > 0 ? Math.round((presentCount / records.length) * 100) : null;

  const totalHw = hwTotal.count ?? 0;
  const totalAck = hwAck.count ?? 0;
  const ackRate = totalHw > 0 ? Math.round((totalAck / totalHw) * 100) : null;

  const exams = examSessions.data ?? [];
  const examPassed = exams.filter((e) => e.status === "passed").length;
  const examFailed = exams.filter((e) => e.status === "failed").length;
  const examTotal = examPassed + examFailed;
  const examPassRate = examTotal > 0 ? Math.round((examPassed / examTotal) * 100) : null;

  const totalCompletions = lessonCompletions.count ?? 0;
  const totalLessonCount = totalLessons.count ?? 0;
  const activeStudentCount = students.count ?? 0;
  const lessonRate = (totalLessonCount > 0 && activeStudentCount > 0)
    ? Math.round((totalCompletions / (totalLessonCount * activeStudentCount)) * 100)
    : null;

  const groupStats = (allGroupsWithStats.data ?? []).map((g) => {
    const enrollments = g.group_enrollments as Array<{ student_profile_id: string }> | null;
    return {
      id: g.id,
      name: g.name,
      studentCount: enrollments?.length ?? 0,
    };
  });

  const [{ data: streakData }, { data: studentProfiles }] = await Promise.all([
    supabase
    .from("attendance_records")
    .select("student_profile_id, status, attendance_sessions!inner(session_date, mosque_id, group_id, groups(name))")
    .eq("attendance_sessions.mosque_id", ctx.mosqueId)
    .gte("attendance_sessions.session_date", since)
    .order("attendance_sessions.session_date", { ascending: true }),
    supabase
    .from("student_profiles")
    .select("id, full_name")
    .eq("mosque_id", ctx.mosqueId)
    .eq("is_active", true),
  ]);

  const studentNames = new Map<string, string>();
  const studentGroups = new Map<string, string>();
  const studentRecords = new Map<string, Array<{ date: string; status: string }>>();

  for (const r of (streakData ?? [])) {
    const sid = r.student_profile_id;
    const sess = r.attendance_sessions as { session_date: string; groups: { name: string } | null };
    if (!studentRecords.has(sid)) studentRecords.set(sid, []);
    studentRecords.get(sid)!.push({ date: sess.session_date, status: r.status });
    if (sess.groups) studentGroups.set(sid, (sess.groups as { name: string }).name);
  }


  for (const s of studentProfiles ?? []) studentNames.set(s.id, s.full_name);

  const STREAK_THRESHOLD = 3;

  type StreakInfo = {
    studentId: string;
    studentName: string;
    groupName: string;
    streakLength: number;
    absentDates: string[];
    currentStreak: boolean;
  };

  const streakStudents: StreakInfo[] = [];
  for (const [sid, recs] of studentRecords.entries()) {
    let streakStart = -1;
    for (let i = 0; i < recs.length; i++) {
      if (recs[i].status === "absent") {
        if (streakStart === -1) streakStart = i;
      } else {
        if (streakStart !== -1 && i - streakStart >= STREAK_THRESHOLD) {
          const absentDates = recs.slice(streakStart, i).map((r) => r.date);
          const existing = streakStudents.find((s) => s.studentId === sid);
          if (!existing || absentDates.length > existing.streakLength) {
            const idx = streakStudents.findIndex((s) => s.studentId === sid);
            const info: StreakInfo = {
              studentId: sid,
              studentName: studentNames.get(sid) ?? "—",
              groupName: studentGroups.get(sid) ?? "",
              streakLength: absentDates.length,
              absentDates,
              currentStreak: false,
            };
            if (idx >= 0) streakStudents[idx] = info; else streakStudents.push(info);
          }
        }
        streakStart = -1;
      }
    }
    if (streakStart !== -1 && recs.length - streakStart >= STREAK_THRESHOLD) {
      const absentDates = recs.slice(streakStart).map((r) => r.date);
      const info: StreakInfo = {
        studentId: sid,
        studentName: studentNames.get(sid) ?? "—",
        groupName: studentGroups.get(sid) ?? "",
        streakLength: absentDates.length,
        absentDates,
        currentStreak: true,
      };
      const idx = streakStudents.findIndex((s) => s.studentId === sid);
      if (idx >= 0) {
        if (info.streakLength > streakStudents[idx].streakLength) streakStudents[idx] = info;
      } else {
        streakStudents.push(info);
      }
    }
  }

  streakStudents.sort((a, b) => {
    if (a.currentStreak !== b.currentStreak) return a.currentStreak ? -1 : 1;
    return b.streakLength - a.streakLength;
  });

  const statCards = [
    { label: t("groups"),   value: groups.count   ?? 0, Icon: BookOpen,      bg: "bg-accent-subtle",   fg: "text-accent",   href: "/admin/groups"   },
    { label: t("students"), value: students.count ?? 0, Icon: GraduationCap, bg: "bg-accent-subtle", fg: "text-accent", href: "/admin/students" },
    { label: t("teachers"), value: teachers.count ?? 0, Icon: Users,         bg: "bg-accent-subtle",                   fg: "text-accent",                          href: "/admin/teachers" },
    { label: t("parents"),  value: parents.count  ?? 0, Icon: Heart,         bg: "bg-accent-subtle",   fg: "text-accent",   href: "/admin/parents"  },
  ];

  const quickActions = [
    { label: t("addTeacher"), href: "/admin/teachers/new", Icon: Users },
    { label: t("addParent"),  href: "/admin/parents/new",  Icon: Heart },
    { label: t("addStudent"), href: "/admin/students",     Icon: GraduationCap },
    { label: t("addGroup"),   href: "/admin/groups",       Icon: BookOpen },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title={t("overview")}
        actions={
          <span className="text-xs text-muted">
            {t("sinceSchoolYear")}: {formatDate(since, locale, { month: "short", day: "numeric", year: "numeric" })}
          </span>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="group rounded-xl border border-card-border bg-card p-5 transition-all hover:border-accent/40 hover:shadow-elevated"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted truncate">{s.label}</p>
                <p className="mt-1.5 text-3xl font-semibold tracking-tight">{s.value}</p>
              </div>
              <div className={`shrink-0 rounded-lg p-2 ${s.bg}`}>
                <s.Icon className={`h-4 w-4 ${s.fg}`} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <PrayerTimesSection mosqueId={ctx.mosqueId} />

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted uppercase tracking-wide">{t("quickActions")}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((a) => (
            <Link
              key={a.href + a.label}
              href={a.href}
              className="flex items-center gap-2 rounded-xl border border-card-border bg-card px-4 py-3 text-sm font-medium transition-all hover:border-accent/40 hover:bg-accent-subtle hover:text-accent"
            >
              <Plus className="h-4 w-4 shrink-0" />
              {a.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-card-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-accent-subtle p-1.5">
              <TrendingUp className="h-4 w-4 text-accent" />
            </div>
            <p className="text-sm font-medium text-muted">{t("attendanceRateYear")}</p>
          </div>
          {attendanceRate !== null ? (
            <>
              <p className="text-3xl font-semibold tracking-tight text-accent">{attendanceRate}%</p>
              <div className="space-y-1">
                <div className="h-2 rounded-full bg-card-border/60 overflow-hidden">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${attendanceRate}%` }} />
                </div>
                <p className="text-xs text-muted">{presentCount} / {records.length} {t("recordsPresent")}</p>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">{t("noDataYet")}</p>
          )}
        </div>

        <div className="rounded-xl border border-card-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-accent-subtle p-1.5">
              <CheckSquare className="h-4 w-4 text-accent" />
            </div>
            <p className="text-sm font-medium text-muted">{t("homeworkAckRateYear")}</p>
          </div>
          {ackRate !== null ? (
            <>
              <p className="text-3xl font-semibold tracking-tight text-accent">{ackRate}%</p>
              <div className="space-y-1">
                <div className="h-2 rounded-full bg-card-border/60 overflow-hidden">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(ackRate, 100)}%` }} />
                </div>
                <p className="text-xs text-muted">{totalAck} {t("acknowledgements")} / {totalHw} {t("assignments")}</p>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">{t("noDataYet")}</p>
          )}
        </div>

        <div className="rounded-xl border border-card-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-accent-subtle p-1.5">
              <Trophy className="h-4 w-4 text-accent" />
            </div>
            <p className="text-sm font-medium text-muted">{t("examPassRateYear")}</p>
          </div>
          {examPassRate !== null ? (
            <>
              <p className="text-3xl font-semibold tracking-tight text-accent">{examPassRate}%</p>
              <div className="space-y-1">
                <div className="h-2 rounded-full bg-card-border/60 overflow-hidden">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${examPassRate}%` }} />
                </div>
                <p className="text-xs text-muted">{examPassed} {t("examPassed")} / {examTotal} {t("examTotal")}</p>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">{t("noDataYet")}</p>
          )}
        </div>

        <div className="rounded-xl border border-card-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-accent-subtle p-1.5">
              <ClipboardList className="h-4 w-4 text-accent" />
            </div>
            <p className="text-sm font-medium text-muted">{t("lessonCompletionYear")}</p>
          </div>
          {lessonRate !== null ? (
            <>
              <p className="text-3xl font-semibold tracking-tight text-accent">{lessonRate}%</p>
              <div className="space-y-1">
                <div className="h-2 rounded-full bg-card-border/60 overflow-hidden">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(lessonRate, 100)}%` }} />
                </div>
                <p className="text-xs text-muted">{totalCompletions} / {totalLessonCount * activeStudentCount} {t("lessonsCompleted")}</p>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">{t("noDataYet")}</p>
          )}
        </div>
      </div>

      {streakStudents.length > 0 && (
        <div className="rounded-xl border border-danger/30 bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-danger-subtle p-1.5">
              <AlertTriangle className="h-4 w-4 text-danger-fg" />
            </div>
            <p className="text-sm font-medium text-danger-fg">{t("absenceStreakTitle")}</p>
          </div>
          <p className="text-xs text-muted">{t("absenceStreakDesc")}</p>
          <div className={listCard}>
            {streakStudents.map((s) => (
              <Link
                key={s.studentId}
                href={`/admin/students/${s.studentId}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-surface/50 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{s.studentName}</span>
                    {s.currentStreak && (
                      <span className="rounded-full bg-danger-subtle text-danger-fg text-[11px] font-semibold px-1.5 py-0.5">
                        {t("absenceStreakActive")}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {s.groupName && <span className="text-xs text-muted">{s.groupName}</span>}
                    <span className="text-xs text-muted">
                      {s.absentDates.length}x {t("absent")} &middot; {s.absentDates[0]} – {s.absentDates[s.absentDates.length - 1]}
                    </span>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-danger-subtle text-danger-fg text-xs font-semibold px-2.5 py-1">
                  {s.streakLength}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {groupStats.length > 0 && (
        <div className="rounded-xl border border-card-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-accent-subtle p-1.5">
              <BarChart3 className="h-4 w-4 text-accent" />
            </div>
            <p className="text-sm font-medium text-muted">{t("groupOverviewYear")}</p>
          </div>
          <div className="divide-y divide-card-border">
            {groupStats.map((g) => (
              <Link
                key={g.id}
                href={`/admin/groups/${g.id}`}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0 hover:text-accent transition-colors"
              >
                <span className="text-sm font-medium">{g.name}</span>
                <span className="text-xs text-muted">{g.studentCount} {t("students")}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <DashboardCalendar
        sessions={calendarSessionsData.data ?? []}
        holidays={holidaysData.data ?? []}
        events={calendarEventsData.data ?? []}
        sessionBasePath="/admin/groups"
      />
    </div>
  );
}
