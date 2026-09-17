import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/ActionForm";
import { PageHeader } from "@/components/PageHeader";
import { FormField, FormCard, inputCls, selectCls } from "@/components/FormField";
import { Link } from "@/i18n/routing";
import {
  Users,
  ClipboardCheck,
  BarChart3,
  CalendarDays,
  ChevronDown,
  MapPin,
} from "lucide-react";

import {
  createHomework,
  setAttendance,
  toggleHomeworkPublished,
  upsertHifzProgress,
} from "./actions";
import { GroupActions } from "./GroupActions";
import { AttendanceTaker, type AttendanceStatus } from "@/components/AttendanceTaker";
import { getMosqueConfig } from "@/lib/mosque-config";
import { RosterSectionClient } from "./RosterSectionClient";
import { TeachersSectionClient } from "./TeachersSectionClient";
import { CollapsibleAddCard } from "@/components/CollapsibleAddCard";
import { HifzTracker } from "@/components/HifzTracker";
import { getActivePlugins } from "@/lib/plugins";
import { buttonVariants } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { listCard } from "@/components/ui/surfaces";

import { PageTabs, resolveTab, type PageTab } from "@/components/PageTabs";
type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string; tab?: string }>;
};

export default async function GroupDetailPage({ params, searchParams }: PageProps) {
  const { id: groupId } = await params;
  const { date: dateParam, tab: tabParam } = await searchParams;
  const ctx = await requireAdmin();
  const t = await getTranslations("Admin");
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: group } = await supabase
    .from("groups")
    .select("id, name, description, room, category_id, group_categories(id, name, color, is_hifz)")
    .eq("id", groupId)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();
  if (!group) notFound();

  const [
    { data: enrollments },
    { data: allStudents },
    { data: teacherLinks },
    { data: allTeachers },
    { data: homework },
    { data: lessons },
    { data: sessions },
    { data: categories },
  ] = await Promise.all([
    supabase
      .from("group_enrollments")
      .select("id, is_active, student_profile_id, student_profiles(full_name)")
      .eq("group_id", groupId)
      .eq("is_active", true)
      .order("created_at"),
    supabase
      .from("student_profiles")
      .select("id, full_name")
      .eq("mosque_id", ctx.mosqueId)
      .eq("is_active", true)
      .order("full_name"),
    supabase
      .from("teacher_group_links")
      .select("id, is_active, teacher_profile_id, teacher_profiles(id, profiles(display_name, full_name))")
      .eq("group_id", groupId)
      .eq("is_active", true),
    supabase
      .from("teacher_profiles")
      .select("id, profiles(display_name, full_name)")
      .eq("mosque_id", ctx.mosqueId)
      .eq("is_active", true),
    supabase
      .from("homework_assignments")
      .select("id, title, body, due_date, audience, is_published, lesson_id, lessons(title), homework_targets(student_profile_id, student_profiles(full_name))")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false }),
    supabase
      .from("lessons")
      .select("id, title")
      .eq("mosque_id", ctx.mosqueId)
      .order("title"),
    supabase
      .from("attendance_sessions")
      .select("id, session_date, attendance_records(status, student_profile_id, student_profiles(full_name))")
      .eq("group_id", groupId)
      .order("session_date", { ascending: false })
      .limit(10),
    supabase
      .from("group_categories")
      .select("id, name, color")
      .eq("mosque_id", ctx.mosqueId)
      .order("name"),
  ]);

  const enrolledStudentsAll = (enrollments ?? []).map((e) => ({
    enrollmentId: e.id,
    studentId: e.student_profile_id,
    name: (e.student_profiles as { full_name: string } | null)?.full_name ?? "—",
  }));
  const enrolledStudents = Array.from(
    new Map(enrolledStudentsAll.map((s) => [s.studentId, s])).values()
  );
  const enrolledIds = new Set(enrolledStudents.map((s) => s.studentId));
  const candidateStudents = (allStudents ?? [])
    .filter((s) => !enrolledIds.has(s.id))
    .map((s) => ({ id: s.id, label: s.full_name }));

  const category = group.group_categories
    ? (group.group_categories as { id: string; name: string; color: string; is_hifz: boolean })
    : null;
  const isHifzGroup = category?.is_hifz === true;

  const today = new Date().toISOString().slice(0, 10);
  const attendanceDate = dateParam || today;
  const [activePlugins, { data: hifzRows }, { schoolYearStart: since }, { data: currentSession }, { data: scheduleRows }] = await Promise.all([
    getActivePlugins(ctx.mosqueId),
    isHifzGroup && enrolledStudents.length > 0
      ? supabase
          .from("hifz_progress")
          .select("student_profile_id, pages_memorized, notes")
          .eq("group_id", groupId)
          .eq("mosque_id", ctx.mosqueId)
      : Promise.resolve({ data: null }),
    getMosqueConfig(ctx.mosqueId),
    supabase
      .from("attendance_sessions")
      .select("id, attendance_records(student_profile_id, status)")
      .eq("group_id", groupId)
      .eq("session_date", attendanceDate)
      .maybeSingle(),
    supabase
      .from("teaching_schedules")
      .select("day_of_week, start_time, end_time")
      .eq("group_id", groupId),
  ]);
  const hifzPluginActive = activePlugins.has("quran_hifz");
  const showHifz = isHifzGroup && hifzPluginActive;

  const hifzMap = new Map(
    (hifzRows ?? []).map((r) => [
      r.student_profile_id,
      { pages: r.pages_memorized, notes: r.notes as string | null },
    ]),
  );


  const [
    { data: groupAttendance },
    { data: groupHwTotal },
    { data: groupHwAck },
    { data: groupExamSessions },
    { data: groupLessonCompletions },
    { data: groupAllLessons },
  ] = enrolledStudents.length > 0 && tabParam === "progress" ? await Promise.all([
    supabase
      .from("attendance_records")
      .select("student_profile_id, status, attendance_sessions!inner(session_date)")
      .eq("attendance_sessions.group_id", groupId)
      .gte("attendance_sessions.session_date", since),
    supabase
      .from("homework_assignments")
      .select("id")
      .eq("group_id", groupId)
      .eq("is_published", true)
      .gte("created_at", since),
    supabase
      .from("homework_submissions")
      .select("homework_id, student_profile_id")
      .eq("mosque_id", ctx.mosqueId)
      .gte("acknowledged_at", since),
    supabase
      .from("exam_sessions")
      .select("student_profile_id, status, summary, exam_date")
      .eq("from_group_id", groupId)
      .in("status", ["passed", "failed"]),
    supabase
      .from("lesson_completions")
      .select("student_profile_id, lesson_id")
      .eq("mosque_id", ctx.mosqueId)
      .in("student_profile_id", enrolledStudents.map((s) => s.studentId))
      .gte("created_at", since),
    supabase
      .from("lessons")
      .select("id")
      .eq("mosque_id", ctx.mosqueId),
  ]) : [{ data: null }, { data: null }, { data: null }, { data: null }, { data: null }, { data: null }] as const;

  const assignedTeacherIds = new Set((teacherLinks ?? []).map((l) => l.teacher_profile_id));
  const candidateTeachers = (allTeachers ?? [])
    .filter((t) => !assignedTeacherIds.has(t.id))
    .map((teacherItem) => {
      const p = teacherItem.profiles as { display_name: string | null; full_name: string | null } | null;
      return { id: teacherItem.id, label: p?.display_name ?? p?.full_name ?? t("noName") };
    });

  const homeworkAction = createHomework.bind(null, groupId);
  const setAttendanceAction = setAttendance.bind(null, groupId);


  const currentStatuses: Record<string, AttendanceStatus> = {};
  for (const r of (currentSession?.attendance_records ?? []) as Array<{
    student_profile_id: string;
    status: AttendanceStatus;
  }>) {
    currentStatuses[r.student_profile_id] = r.status;
  }

  const scheduleDays = new Set<number>((scheduleRows ?? []).map((r) => r.day_of_week));
  const firstSched = (scheduleRows ?? [])[0];
  const scheduleStart = (firstSched?.start_time ?? "10:00:00").slice(0, 5);
  const scheduleEnd = (firstSched?.end_time ?? "12:00:00").slice(0, 5);
  // Calculate next group session date for default due date
  const nextSessionDate = (() => {
    if (scheduleDays.size === 0) {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      return d.toISOString().slice(0, 10);
    }
    const today = new Date();
    for (let i = 1; i <= 7; i++) {
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + i);
      if (scheduleDays.has(nextDate.getDay())) {
        return nextDate.toISOString().slice(0, 10);
      }
    }
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  })();

  const tabs: PageTab[] = [
    { key: "attendance", label: t("attendance") },
    { key: "people", label: t("students"), count: enrolledStudents.length },
    ...(showHifz && enrolledStudents.length > 0 ? [{ key: "hifz", label: t("hifzProgress") }] : []),
    { key: "homework", label: t("homework") },
    ...(enrolledStudents.length > 0 ? [{ key: "progress", label: t("groupProgress") }] : []),
  ];
  const activeTab = resolveTab(tabs, tabParam);

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        icon={<Users className="h-5 w-5" />}
        title={
          <div className="flex flex-wrap items-center gap-3">
            <span>{group.name}</span>
            {category && (
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white whitespace-nowrap"
                style={{ backgroundColor: category.color }}
              >
                {category.name}
              </span>
            )}
            {group.room && (
              <span className="inline-flex items-center gap-1 rounded-full border border-card-border px-2.5 py-0.5 text-xs font-medium text-muted whitespace-nowrap">
                <MapPin className="h-3 w-3" />
                {group.room}
              </span>
            )}
          </div>
        }
        description={group.description ?? undefined}
        breadcrumbs={[
          { href: "/admin", label: t("overview") },
          { href: "/admin/groups", label: t("groups") },
          { label: group.name },
        ]}
        actions={
          <GroupActions
            groupId={groupId}
            groupName={group.name}
            groupDescription={group.description}
            groupRoom={group.room}
            groupCategoryId={group.category_id}
            categories={(categories as Array<{ id: string; name: string; color: string }>) ?? []}
            archiveLabel={t("archiveGroup")}
            deleteLabel={t("deleteGroup")}
            confirmArchive={t("confirmDeleteGroup")}
            confirmDelete={t("confirmDeleteGroup")}
            cancelLabel={t("cancel")}
            groupsPath="/admin/groups"
            initialWeekdays={Array.from(scheduleDays)}
            initialStartTime={scheduleStart}
            initialEndTime={scheduleEnd}
          />
        }
      />

      <PageTabs tabs={tabs} active={activeTab} basePath={`/admin/groups/${groupId}`} label={group.name} />

      {activeTab === "attendance" ? (<>
      {/* ── Attendance ─────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-muted" />
          <h2 className="text-base font-semibold tracking-tight">{t("attendance")}</h2>
        </div>

        <AttendanceTaker
          date={attendanceDate}
          students={enrolledStudents.map((s) => ({ id: s.studentId, name: s.name }))}
          initialStatuses={currentStatuses}
          setAction={setAttendanceAction}
          labels={{
            sessionDate: t("sessionDate"),
            present: t("present"),
            absent: t("absent"),
            late: t("late"),
            excused: t("excused"),
            notSet: t("attendanceNotSet"),
            saveError: t("attendanceSaveError"),
            enrollFirst: t("enrollFirstAttendance"),
          }}
        />

        {/* Session history */}
        {(sessions ?? []).length > 0 && (
          <ul className={listCard}>
            {(sessions ?? []).map((s, index) => {
              const records = (s.attendance_records ?? []) as Array<{
                status: string;
                student_profile_id: string;
                student_profiles: { full_name: string } | null;
              }>;
              const presentCount = records.filter((r) => r.status === "present" || r.status === "late").length;
              const absentCount = records.filter((r) => r.status === "absent").length;
              const excusedCount = records.filter((r) => r.status === "excused").length;
              return (
                <li key={s.id} className="p-4 flex items-start justify-between gap-4">
                  <details className="group/details min-w-0 flex-1" open={index === 0}>
                    <summary className="flex items-start justify-between gap-2 list-none cursor-pointer [&::-webkit-details-marker]:hidden">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">
                          {formatDate(s.session_date, locale, { weekday: "short", month: "short", day: "numeric" })}
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap text-xs">
                          {presentCount > 0 && (
                            <span className="rounded-full bg-success-subtle text-success-fg px-2.5 py-0.5 font-semibold whitespace-nowrap">
                              {presentCount} {t("present")}
                            </span>
                          )}
                          {absentCount > 0 && (
                            <span className="rounded-full bg-danger-subtle text-danger-fg px-2.5 py-0.5 font-semibold whitespace-nowrap">
                              {absentCount} {t("absent")}
                            </span>
                          )}
                          {excusedCount > 0 && (
                            <span className="rounded-full bg-info-subtle text-info-fg px-2.5 py-0.5 font-semibold whitespace-nowrap">
                              {excusedCount} {t("excused")}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronDown className="h-4 w-4 mt-0.5 text-muted shrink-0 transition-transform duration-200 group-open/details:rotate-180" />
                    </summary>
                    <div className="mt-3 rounded-xl border border-card-border overflow-hidden divide-y divide-card-border text-sm">
                      {records.map((r) => {
                        const statusCls =
                          r.status === "present" ? "bg-success-subtle text-success-fg" :
                          r.status === "late"    ? "bg-warning-subtle text-warning-fg" :
                          r.status === "absent"  ? "bg-danger-subtle text-danger-fg" :
                                                   "bg-info-subtle text-info-fg";
                        const statusLabel: Record<string, string> = {
                          present: t("present"), absent: t("absent"),
                          late: t("late"), excused: t("excused"),
                        };
                        return (
                          <div key={r.student_profile_id} className="flex items-center justify-between px-3 py-2">
                            <span className="font-medium">{r.student_profiles?.full_name ?? "—"}</span>
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusCls}`}>
                              {statusLabel[r.status] ?? r.status}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                  <Link
                    href={`/admin/attendance/${s.id}/print`}
                    target="_blank"
                    className="text-xs text-accent hover:underline shrink-0 pt-0.5"
                  >
                    {t("print")}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      </>) : null}

      {activeTab === "people" ? (
        <div className="space-y-10">
      {/* ── Roster ─────────────────────────────────────────────────────── */}
      <RosterSectionClient
        groupId={groupId}
        initialEnrolledStudents={enrolledStudents}
        allStudents={(allStudents ?? []).map((s) => ({ id: s.id, name: s.full_name }))}
        hifzData={showHifz ? Object.fromEntries(
          enrolledStudents.map((s) => [s.studentId, hifzMap.get(s.studentId)?.pages ?? 0])
        ) : undefined}
      />

      {/* ── Teachers ───────────────────────────────────────────────────── */}
      <TeachersSectionClient
        groupId={groupId}
        initialTeacherLinks={(teacherLinks ?? []).map((l) => {
          const p = (l.teacher_profiles as { profiles: { display_name: string | null; full_name: string | null } | null } | null)?.profiles;
          return {
            id: l.id,
            teacherProfileId: l.teacher_profile_id,
            name: p?.display_name ?? p?.full_name ?? t("noName"),
          };
        })}
        allTeachers={(allTeachers ?? []).map((teacher) => {
          const p = teacher.profiles as { display_name: string | null; full_name: string | null } | null;
          return {
            id: teacher.id,
            name: p?.display_name ?? p?.full_name ?? t("noName"),
          };
        })}
      />

      </div>) : null}

      {activeTab === "hifz" ? (<>
      {/* ── Hifz Tracker ──────────────────────────────────────────────── */}
      {showHifz && enrolledStudents.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-success-fg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                <path d="M6 8h2"/><path d="M6 12h2"/><path d="M16 8h2"/><path d="M16 12h2"/>
              </svg>
            </span>
            <h2 className="text-base font-semibold tracking-tight">{t("hifzProgress")}</h2>
          </div>
          <HifzTracker
            groupId={groupId}
            students={enrolledStudents.map((s) => ({
              id: s.studentId,
              name: s.name,
              pagesMemorized: hifzMap.get(s.studentId)?.pages ?? 0,
              notes: hifzMap.get(s.studentId)?.notes ?? null,
            }))}
            upsertAction={upsertHifzProgress}
            labels={{
              title: t("hifzProgress"),
              pages: t("hifzPages"),
              juz: t("hifzJuz"),
              progress: t("hifzProgressLabel"),
              save: t("save"),
              notes: t("notesOptional"),
              noStudents: t("noStudentsEnrolled"),
              outOf: t("hifzOutOf"),
            }}
          />
        </section>
      )}

      </>) : null}

      {activeTab === "homework" ? (<>
      {/* ── Homework ───────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-muted" />
          <h2 className="text-base font-semibold tracking-tight">{t("homework")}</h2>
        </div>

        <CollapsibleAddCard buttonLabel={t("newHomework")}>
        <FormCard
          title={t("newHomework")}
          description={t("homeworkFormDesc")}
        >
          <ActionForm
            action={homeworkAction}
            successMessage={t("homeworkPublished")}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label={t("title")} required>
                <input
                  name="title"
                  required
                  placeholder={t("homeworkTitlePlaceholder")}
                  className={inputCls}
                />
              </FormField>
              <FormField label={t("dueDate")}>
                <input type="date" name="due_date" defaultValue={nextSessionDate} className={inputCls} />
              </FormField>
            </div>

            <FormField label={t("instructionsOpt")}>
              <textarea
                name="body"
                rows={3}
                placeholder={t("instructionsPlaceholder")}
                className={`${inputCls} resize-none`}
              />
            </FormField>

            <FormField label={t("relatedLessonOpt")}>
              <select name="lesson_id" defaultValue="" className={selectCls}>
                <option value="">{t("noneFreeForm")}</option>
                {(lessons ?? []).map((l) => (
                  <option key={l.id} value={l.id}>{l.title}</option>
                ))}
              </select>
            </FormField>

            {/* Audience */}
            <div className="group/audience rounded-xl border border-card-border p-4 space-y-3">
              <p className="text-sm font-medium">{t("audience")}</p>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="audience"
                    value="group"
                    defaultChecked
                    className="accent-accent"
                  />
                  {t("wholeGroup")}
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="audience"
                    id="audience-individual"
                    value="individual"
                    className="accent-accent"
                  />
                  {t("specificStudents")}
                </label>
              </div>
              {enrolledStudents.length > 0 ? (
                <div className="hidden group-has-[#audience-individual:checked]/audience:grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                  {enrolledStudents.map((s) => (
                    <label
                      key={s.studentId}
                      className="flex items-center gap-2 text-sm cursor-pointer rounded-lg px-2 py-1.5 hover:bg-surface transition-colors"
                    >
                      <input
                        type="checkbox"
                        name="student_ids"
                        value={s.studentId}
                        className="accent-accent"
                      />
                      <span className="truncate">{s.name}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted">{t("enrollFirstTarget")}</p>
              )}
            </div>

            <button
              type="submit"
              className={buttonVariants({ size: "xl" })}
            >
              {t("publishHomework")}
            </button>
          </ActionForm>
        </FormCard>
        </CollapsibleAddCard>

        {/* Homework list */}
        {(homework ?? []).length > 0 && (
          <ul className={listCard}>
            {(homework ?? []).map((h) => {
              const lesson = h.lessons as { title: string } | null;
              const targets = (h.homework_targets ?? []) as Array<{
                student_profile_id: string;
                student_profiles: { full_name: string } | null;
              }>;
              const isOverdue = h.due_date && new Date(h.due_date) < new Date();
              return (
                <li key={h.id} className="px-4 py-3 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-sm">{h.title}</span>
                    <span className={`text-xs rounded-full px-2.5 py-0.5 font-medium ${
                      h.audience === "group"
                        ? "bg-info-subtle text-info-fg"
                        : "bg-warning-subtle text-warning-fg"
                    }`}>
                      {h.audience === "group" ? t("wholeGroup") : t("specificStudents")}
                    </span>
                    {lesson && (
                      <span className="text-xs rounded-full bg-accent-subtle px-2.5 py-0.5 text-accent">
                        {lesson.title}
                      </span>
                    )}
                    {h.due_date && (
                      <span className={`text-xs ${isOverdue ? "text-danger" : "text-muted"}`}>
                        {t("due")} {formatDate(h.due_date, locale, { day: "numeric", month: "short" })}
                      </span>
                    )}
                    <ActionForm action={toggleHomeworkPublished.bind(null, h.id, !!(h.is_published))} successMessage="">
                      <button type="submit" className={`text-xs rounded-full px-2.5 py-0.5 font-medium border transition-colors ${
                        h.is_published
                          ? "border-success/50 bg-success-subtle text-success-fg hover:bg-success-subtle"
                          : "border-card-border bg-card text-muted-foreground hover:bg-accent-subtle"
                      }`}>
                        {h.is_published ? t("published") : t("draft")}
                      </button>
                    </ActionForm>
                  </div>
                  {h.body && <p className="text-xs text-muted">{h.body}</p>}
                  {h.audience === "individual" && targets.length > 0 && (
                    <p className="text-xs text-muted">
                      {t("for")} {targets.map((t) => t.student_profiles?.full_name ?? "—").join(", ")}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      </>) : null}

      {activeTab === "progress" ? (<>
      {/* ── Group Progress ─────────────────────────────────────────── */}
      {enrolledStudents.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-muted" />
            <h2 className="text-base font-semibold tracking-tight">{t("groupProgress")}</h2>
            <span className="text-xs text-muted ml-2">{t("sinceSchoolYear")}: {formatDate(since, locale, { month: "short", day: "numeric", year: "numeric" })}</span>
          </div>

          {(() => {
            const attRecords = (groupAttendance ?? []) as Array<{
              student_profile_id: string;
              status: string;
            }>;
            const attPresent = attRecords.filter((r) => r.status === "present" || r.status === "late").length;
            const attRate = attRecords.length > 0 ? Math.round((attPresent / attRecords.length) * 100) : null;

            const hwCount = (groupHwTotal ?? []).length;
            const ackCount = (groupHwAck ?? []).length;
            const hwRate = hwCount > 0 ? Math.round((ackCount / (hwCount * enrolledStudents.length)) * 100) : null;

            const exams = (groupExamSessions ?? []) as Array<{
              student_profile_id: string;
              status: string;
              summary: string | null;
              exam_date: string | null;
            }>;
            const passed = exams.filter((e) => e.status === "passed").length;
            const failed = exams.filter((e) => e.status === "failed").length;
            const examRate = (passed + failed) > 0 ? Math.round((passed / (passed + failed)) * 100) : null;

            const completions = (groupLessonCompletions ?? []) as Array<{
              student_profile_id: string;
              lesson_id: string;
            }>;
            const totalLessonCount = (groupAllLessons ?? []).length;
            const lessonRate = totalLessonCount > 0 ? Math.round((completions.length / (totalLessonCount * enrolledStudents.length)) * 100) : null;

            const studentAttMap = new Map<string, { present: number; total: number }>();
            for (const r of attRecords) {
              const cur = studentAttMap.get(r.student_profile_id) ?? { present: 0, total: 0 };
              cur.total++;
              if (r.status === "present" || r.status === "late") cur.present++;
              studentAttMap.set(r.student_profile_id, cur);
            }

            const studentCompletionMap = new Map<string, number>();
            for (const c of completions) {
              studentCompletionMap.set(c.student_profile_id, (studentCompletionMap.get(c.student_profile_id) ?? 0) + 1);
            }

            const studentExamMap = new Map<string, { passed: number; failed: number }>();
            for (const e of exams) {
              const cur = studentExamMap.get(e.student_profile_id) ?? { passed: 0, failed: 0 };
              if (e.status === "passed") cur.passed++; else cur.failed++;
              studentExamMap.set(e.student_profile_id, cur);
            }

            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-card-border bg-card p-4 space-y-2">
                    <p className="text-xs font-medium text-muted">{t("attendanceRateYear")}</p>
                    {attRate !== null ? (
                      <>
                        <p className="text-2xl font-semibold text-accent">{attRate}%</p>
                        <div className="h-1.5 rounded-full bg-card-border/60 overflow-hidden">
                          <div className="h-full rounded-full bg-accent" style={{ width: `${attRate}%` }} />
                        </div>
                      </>
                    ) : <p className="text-sm text-muted">{t("noDataYet")}</p>}
                  </div>
                  <div className="rounded-xl border border-card-border bg-card p-4 space-y-2">
                    <p className="text-xs font-medium text-muted">{t("homeworkAckRateYear")}</p>
                    {hwRate !== null ? (
                      <>
                        <p className="text-2xl font-semibold text-accent">{hwRate}%</p>
                        <div className="h-1.5 rounded-full bg-card-border/60 overflow-hidden">
                          <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(hwRate, 100)}%` }} />
                        </div>
                      </>
                    ) : <p className="text-sm text-muted">{t("noDataYet")}</p>}
                  </div>
                  <div className="rounded-xl border border-card-border bg-card p-4 space-y-2">
                    <p className="text-xs font-medium text-muted">{t("examPassRateYear")}</p>
                    {examRate !== null ? (
                      <>
                        <p className="text-2xl font-semibold text-accent">{examRate}%</p>
                        <div className="h-1.5 rounded-full bg-card-border/60 overflow-hidden">
                          <div className="h-full rounded-full bg-accent" style={{ width: `${examRate}%` }} />
                        </div>
                      </>
                    ) : <p className="text-sm text-muted">{t("noDataYet")}</p>}
                  </div>
                  <div className="rounded-xl border border-card-border bg-card p-4 space-y-2">
                    <p className="text-xs font-medium text-muted">{t("lessonCompletionYear")}</p>
                    {lessonRate !== null ? (
                      <>
                        <p className="text-2xl font-semibold text-accent">{lessonRate}%</p>
                        <div className="h-1.5 rounded-full bg-card-border/60 overflow-hidden">
                          <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(lessonRate, 100)}%` }} />
                        </div>
                      </>
                    ) : <p className="text-sm text-muted">{t("noDataYet")}</p>}
                  </div>
                </div>

                <div className="rounded-xl border border-card-border overflow-hidden">
                  <div className="px-4 py-3 border-b border-card-border bg-card">
                    <h3 className="text-sm font-semibold">{t("studentProgressTable")}</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-card-border bg-surface/50">
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted">{t("students")}</th>
                          <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted">{t("attendance")}</th>
                          <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted">{t("lessonProgress")}</th>
                          <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted">{t("examsLabel")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-card-border">
                        {enrolledStudents.map((s) => {
                          const att = studentAttMap.get(s.studentId);
                          const sAttRate = att && att.total > 0 ? Math.round((att.present / att.total) * 100) : null;
                          const sCompleted = studentCompletionMap.get(s.studentId) ?? 0;
                          const sLessonRate = totalLessonCount > 0 ? Math.round((sCompleted / totalLessonCount) * 100) : null;
                          const sExam = studentExamMap.get(s.studentId);
                          return (
                            <tr key={s.studentId} className="hover:bg-surface/50">
                              <td className="px-4 py-2.5">
                                <Link href={`/admin/students/${s.studentId}`} className="font-medium hover:text-accent transition-colors">
                                  {s.name}
                                </Link>
                              </td>
                              <td className="text-center px-3 py-2.5">
                                {sAttRate !== null ? (
                                  <span className={`text-xs font-semibold ${sAttRate >= 80 ? "text-success-fg" : sAttRate >= 60 ? "text-warning-fg" : "text-danger-fg"}`}>
                                    {sAttRate}%
                                  </span>
                                ) : <span className="text-xs text-muted">—</span>}
                              </td>
                              <td className="text-center px-3 py-2.5">
                                {sLessonRate !== null ? (
                                  <span className={`text-xs font-semibold ${sLessonRate >= 80 ? "text-success-fg" : sLessonRate >= 50 ? "text-warning-fg" : "text-danger-fg"}`}>
                                    {sLessonRate}%
                                  </span>
                                ) : <span className="text-xs text-muted">—</span>}
                              </td>
                              <td className="text-center px-3 py-2.5">
                                {sExam ? (
                                  <div className="flex items-center justify-center gap-1.5 text-xs">
                                    {sExam.passed > 0 && <span className="text-success-fg font-medium">&#10003;{sExam.passed}</span>}
                                    {sExam.failed > 0 && <span className="text-danger-fg font-medium">&#10007;{sExam.failed}</span>}
                                  </div>
                                ) : <span className="text-xs text-muted">—</span>}
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
          })()}
        </section>
      )}
</>) : null}
    </div>
  );
}
