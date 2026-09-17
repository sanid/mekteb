import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { Users, ChevronDown, CalendarCheck } from "lucide-react";

import { requireTeacher } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getActivePlugins } from "@/lib/plugins";
import { ActionForm } from "@/components/ActionForm";
import { Link } from "@/i18n/routing";
import { PageHeader, SectionHeader } from "@/components/PageHeader";
import { CollapsibleAddCard } from "@/components/CollapsibleAddCard";

import {
  addProgressNote,
  bulkExamRequest,
  cancelExamRequest,
  createExamRequest,
  createHomework,
  createParentAndLinkStudent,
  createStudentAndEnroll,
  deleteHomework,
  deleteNote,
  setAttendance,
  toggleLessonCancelled,
  updateHomework,
  updateNote,
  upsertWeeklyNote,
  upsertHifzProgressTeacher,
  openCheckin,
  closeCheckin,
} from "./actions";
import { HifzTracker } from "@/components/HifzTracker";
import { CheckinPanel } from "@/components/CheckinPanel";
import { TeacherCreateParentForm } from "./TeacherCreateParentForm";
import { TeacherCreateStudentForm } from "./TeacherCreateStudentForm";
import { BulkExamForm } from "./BulkExamForm";
import { AttendanceTaker, type AttendanceStatus } from "@/components/AttendanceTaker";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDate, formatDateShort } from "@/lib/format";
import { listCard } from "@/components/ui/surfaces";

import { inputCls } from "@/components/FormField";
import { PageTabs, resolveTab } from "@/components/PageTabs";
type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string; tab?: string }>;
};

export default async function TeacherGroupDetailPage({ params, searchParams }: PageProps) {
  const { id: groupId } = await params;
  const { date: dateParam, tab: tabParam } = await searchParams;
  const ctx = await requireTeacher();
  const locale = await getLocale();
  // QR-Selbstanmeldung plugin gate: controls the scan-to-login QR shown after
  // creating a student/parent account on this page.
  const activePluginsPromise = getActivePlugins(ctx.mosqueId);
  const reqHeaders = await headers();
  const host = reqHeaders.get("host") ?? "";
  const proto =
    reqHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  const baseUrl = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_SITE_URL ?? "");
  const t = await getTranslations("Teacher");
  const tAdmin = await getTranslations("Admin");
  const supabase = await createClient();

  const [activePlugins, { data: link }] = await Promise.all([activePluginsPromise, supabase
    .from("teacher_group_links")
    .select("group_id, groups(id, name, description, category_id, group_categories(id, name, color, is_hifz))")
    .eq("teacher_profile_id", ctx.teacherProfileId)
    .eq("group_id", groupId)
    .eq("is_active", true)
    .maybeSingle()]);

  const group = link?.groups as
    | { id: string; name: string; description: string | null; category_id: string | null; group_categories: { id: string; name: string; color: string; is_hifz: boolean } | null }
    | null;
  if (!link || !group) notFound();
  const qrEnabled = activePlugins.has("qr_self_signup");

  // Local date for "upcoming lessons" — the same UTC-slice the attendance
  // date picker uses elsewhere on this page.
  const todayStr = new Date().toISOString().slice(0, 10);
  const isHifzGroup = group.group_categories?.is_hifz === true;
  const attendanceDate = dateParam || todayStr;

  const [
    { data: enrollments },
    { data: homework },
    { data: lessons },
    { data: sessions },
    { data: notes },
    { data: weeklyNotes },
    { data: examRequests },
    { data: scheduleRows },
    { data: upcomingSessions },
    { data: hifzRows },
    { data: currentSession },
  ] = await Promise.all([
    supabase
      .from("group_enrollments")
      .select("id, student_profile_id, student_profiles(full_name)")
      .eq("group_id", groupId)
      .eq("is_active", true)
      .order("created_at"),
    supabase
      .from("homework_assignments")
      .select(
        "id, title, body, due_date, audience, lesson_id, lessons(title), homework_targets(student_profile_id, student_profiles(full_name)), homework_submissions(id, student_profile_id)",
      )
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("lessons")
      .select("id, title")
      .eq("mosque_id", ctx.mosqueId)
      .order("title"),
    supabase
      .from("attendance_sessions")
      .select(
        "id, session_date, attendance_records(status, student_profile_id, student_profiles(full_name))",
      )
      .eq("group_id", groupId)
      .order("session_date", { ascending: false })
      .limit(10),
    supabase
      .from("progress_notes")
      .select(
        "id, body, visible_to_parents, created_at, author_profile_id, student_profile_id, student_profiles(full_name)",
      )
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("teacher_weekly_notes")
      .select("id, week_start, body, is_published, created_at")
      .eq("group_id", groupId)
      .eq("mosque_id", ctx.mosqueId)
      .order("week_start", { ascending: false })
      .limit(10),
    supabase
      .from("exam_requests")
      .select("id, student_profile_id, status, notes")
      .eq("group_id", groupId)
      .eq("requested_by", ctx.teacherProfileId)
      .order("created_at", { ascending: false }),
    supabase
      .from("teaching_schedules")
      .select("day_of_week")
      .eq("group_id", groupId),
    supabase
      .from("teaching_sessions")
      .select("id, date, start_time, end_time, is_cancelled, notes")
      .eq("group_id", groupId)
      .eq("mosque_id", ctx.mosqueId)
      .gte("date", todayStr)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true })
      .limit(15),
    isHifzGroup
      ? supabase
          .from("hifz_progress")
          .select("student_profile_id, pages_memorized, notes")
          .eq("group_id", groupId)
          .eq("mosque_id", ctx.mosqueId)
      : Promise.resolve({ data: null }),
    supabase
      .from("attendance_sessions")
      .select("id, checkin_active, checkin_token, attendance_records(student_profile_id, status)")
      .eq("group_id", groupId)
      .eq("session_date", attendanceDate)
      .maybeSingle(),
  ]);

  const studentIds = (enrollments ?? []).map((e: { student_profile_id: string }) => e.student_profile_id);

  const { data: parentLinks } = studentIds.length > 0
    ? await supabase
        .from("parent_student_links")
        .select("parent_profile_id, student_profile_id, parent_profiles(id, profiles(full_name, display_name, phone)), student_profiles(full_name)")
        .in("student_profile_id", studentIds)
    : { data: [] };

  const enrolledStudentsAll = (enrollments ?? []).map((e) => ({
    enrollmentId: e.id,
    studentId: e.student_profile_id,
    name:
      (e.student_profiles as { full_name: string } | null)?.full_name ?? "—",
  }));
  const enrolledStudents = Array.from(
    new Map(enrolledStudentsAll.map((s) => [s.studentId, s])).values()
  );

  const studentParentMap = new Map<string, Array<{ parentId: string; parentName: string; parentPhone: string | null }>>();
  for (const link of parentLinks ?? []) {
    const sid = link.student_profile_id;
    const pp = link.parent_profiles as { id: string; profiles: { full_name: string | null; display_name: string | null; phone: string | null } | null } | null;
    const parentName = pp?.profiles?.display_name ?? pp?.profiles?.full_name ?? "—";
    const parentPhone = pp?.profiles?.phone ?? null;
    if (!studentParentMap.has(sid)) studentParentMap.set(sid, []);
    studentParentMap.get(sid)!.push({ parentId: pp!.id, parentName, parentPhone });
  }



  const hifzMap = new Map(
    (hifzRows ?? []).map((r) => [
      r.student_profile_id,
      { pages: r.pages_memorized, notes: r.notes as string | null },
    ]),
  );

  const studentAction = createStudentAndEnroll.bind(null, groupId);
  const parentAction = createParentAndLinkStudent.bind(null, groupId);
  const homeworkAction = createHomework.bind(null, groupId);
  const noteAction = addProgressNote.bind(null, groupId);
  const weeklyNoteAction = upsertWeeklyNote.bind(null, groupId);
  const examRequestAction = createExamRequest.bind(null, groupId);
  const examCancelAction = cancelExamRequest.bind(null, groupId);
  const bulkExamAction = bulkExamRequest.bind(null, groupId);
  const today = new Date().toISOString().slice(0, 10);
  const setAttendanceAction = setAttendance.bind(null, groupId);
  const cancelLessonAction = toggleLessonCancelled;

  const scheduleDays = new Set<number>((scheduleRows ?? []).map((r) => r.day_of_week));
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



  const lastSession = (sessions ?? [])[0] ?? null;
  const lastRate = (() => {
    const recs = (lastSession?.attendance_records ?? []) as Array<{ status: string }>;
    if (recs.length === 0) return null;
    return Math.round((recs.filter((r) => r.status === "present" || r.status === "late").length / recs.length) * 100);
  })();
  const openHomeworkCount = (homework ?? []).filter((h) => !h.due_date || h.due_date >= todayStr).length;
  const nextLesson = (upcomingSessions ?? []).find((x) => !x.is_cancelled) ?? null;

  const currentStatuses: Record<string, AttendanceStatus> = {};
  for (const r of (currentSession?.attendance_records ?? []) as Array<{
    student_profile_id: string;
    status: AttendanceStatus;
  }>) {
    currentStatuses[r.student_profile_id] = r.status;
  }

  const tabs = [
    { key: "attendance", label: tAdmin("attendance"), count: null },
    { key: "students", label: tAdmin("students"), count: enrolledStudents.length },
    ...(isHifzGroup ? [{ key: "hifz", label: t("hifzProgress"), count: null }] : []),
    { key: "homework", label: tAdmin("homework"), count: openHomeworkCount || null },
    { key: "notes", label: t("tabNotes"), count: null },
    { key: "lessons", label: t("upcomingLessons"), count: null },
  ];
  const activeTab = resolveTab(tabs, tabParam);
  const tabHref = (key: string) =>
    key === "attendance" ? `/teacher/groups/${groupId}` : `/teacher/groups/${groupId}?tab=${key}`;

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        icon={<Users className="h-5 w-5" />}
        title={group.name}
        description={group.description ?? undefined}
        breadcrumbs={[
          { href: "/teacher", label: t("overview") },
          { href: "/teacher/groups", label: t("myGroups") },
          { label: group.name },
        ]}
        actions={
          activeTab !== "attendance" ? (
            <Link href={tabHref("attendance")} className={buttonVariants()}>
              <CalendarCheck className="h-4 w-4" />
              {t("takeAttendance")}
            </Link>
          ) : undefined
        }
      />

      {/* Key figures */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-card-border bg-card px-4 py-3">
          <div className="text-xs font-medium text-muted">{tAdmin("students")}</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{enrolledStudents.length}</div>
        </div>
        <div className="rounded-xl border border-card-border bg-card px-4 py-3">
          <div className="text-xs font-medium text-muted">{t("lastAttendance")}</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tracking-tight tabular-nums">
              {lastRate === null ? "—" : `${lastRate}%`}
            </span>
            {lastSession ? (
              <span className="truncate text-xs text-muted">
                {formatDate(lastSession.session_date, locale, { day: "numeric", month: "short" })}
              </span>
            ) : null}
          </div>
        </div>
        <div className="rounded-xl border border-card-border bg-card px-4 py-3">
          <div className="text-xs font-medium text-muted">{t("openHomework")}</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{openHomeworkCount}</div>
        </div>
        <div className="rounded-xl border border-card-border bg-card px-4 py-3">
          <div className="text-xs font-medium text-muted">{t("nextLesson")}</div>
          <div className="mt-1 truncate text-base font-semibold leading-8">
            {nextLesson
              ? `${formatDate(nextLesson.date, locale, { weekday: "short", day: "numeric", month: "short" })}${nextLesson.start_time ? ` · ${nextLesson.start_time.slice(0, 5)}` : ""}`
              : t("noNextLesson")}
          </div>
        </div>
      </div>

      <PageTabs tabs={tabs} active={activeTab} basePath={`/teacher/groups/${groupId}`} label={group.name} />

      {activeTab === "attendance" ? (<>
      {/* --------------------------------------------------------- Attendance */}
      <section className="space-y-6">
        {enrolledStudents.length > 0 && activePlugins.has("student_checkin") ? (
          <CheckinPanel
            groupId={groupId}
            date={attendanceDate}
            locale={locale}
            baseUrl={baseUrl}
            initialActive={Boolean((currentSession as { checkin_active?: boolean } | null)?.checkin_active)}
            initialToken={(currentSession as { checkin_token?: string | null } | null)?.checkin_token ?? null}
            openAction={openCheckin}
            closeAction={closeCheckin}
            labels={{
              title: tAdmin("checkinTitle"),
              open: tAdmin("checkinOpen"),
              close: tAdmin("checkinClose"),
              hint: tAdmin("checkinHint"),
              scanHint: tAdmin("checkinScanHint"),
              linkLabel: tAdmin("checkinLinkLabel"),
            }}
          />
        ) : null}
        <AttendanceTaker
          date={attendanceDate}
          students={enrolledStudents.map((s) => ({ id: s.studentId, name: s.name }))}
          initialStatuses={currentStatuses}
          setAction={setAttendanceAction}
          labels={{
            sessionDate: tAdmin("sessionDate"),
            present: tAdmin("present"),
            absent: tAdmin("absent"),
            late: tAdmin("late"),
            excused: tAdmin("excused"),
            notSet: tAdmin("attendanceNotSet"),
            saveError: tAdmin("attendanceSaveError"),
            enrollFirst: tAdmin("enrollFirstAttendance"),
          }}
        />

        <div className="space-y-3">
        <SectionHeader title={t("recentSessions")} />
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
              <li key={s.id} className="flex items-start justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-4">
                <details className="group/details min-w-0 flex-1" open={index === 0}>
                  <summary className="flex items-center justify-between gap-2 list-none cursor-pointer [&::-webkit-details-marker]:hidden">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
                      <span className="whitespace-nowrap text-sm font-semibold">
                        {formatDate(s.session_date, locale, { weekday: "short", month: "short", day: "numeric" })}
                      </span>
                      {/* Summary pills */}
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        {presentCount > 0 && (
                          <span className="rounded-full bg-success-subtle text-success-fg px-2.5 py-0.5 font-semibold">
                            {presentCount} {tAdmin("present")}
                          </span>
                        )}
                        {absentCount > 0 && (
                          <span className="rounded-full bg-danger-subtle text-danger-fg px-2.5 py-0.5 font-semibold">
                            {absentCount} {tAdmin("absent")}
                          </span>
                        )}
                        {excusedCount > 0 && (
                          <span className="rounded-full bg-info-subtle text-info-fg px-2.5 py-0.5 font-semibold">
                            {excusedCount} {tAdmin("excused")}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted transition-transform duration-200 group-open/details:rotate-180" />
                  </summary>
                  {/* Student rows */}
                  <div className="mt-3 rounded-lg border border-card-border overflow-hidden divide-y divide-card-border text-sm">
                    {records.map((r) => {
                      const statusCls =
                        r.status === "present" ? "bg-success-subtle text-success-fg" :
                        r.status === "late"    ? "bg-warning-subtle text-warning-fg" :
                        r.status === "absent"  ? "bg-danger-subtle text-danger-fg" :
                                                 "bg-info-subtle text-info-fg";
                      return (
                        <div
                          key={r.student_profile_id}
                          className="flex items-center justify-between px-3 py-2"
                        >
                          <span className="font-medium">{r.student_profiles?.full_name ?? "—"}</span>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusCls}`}>
                            {r.status === "present" ? tAdmin("present") :
                             r.status === "late"    ? tAdmin("late") :
                             r.status === "absent"  ? tAdmin("absent") :
                                                      tAdmin("excused")}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </details>
                <Link
                  href={`/teacher/attendance/${s.id}/print`}
                  target="_blank"
                  className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-my-1 shrink-0 text-muted")}
                >
                  {tAdmin("print")}
                </Link>
              </li>
            );
          })}
          {!sessions || sessions.length === 0 ? (
            <li className="p-4 text-sm text-muted">{tAdmin("noAttendance")}</li>
          ) : null}
        </ul>
        </div>
      </section>

      </>) : null}

      {activeTab === "students" ? (<>
      {/* ------------------------------------------------------------ Roster */}
      <section className="space-y-4">
        <ul className={listCard}>
          {enrolledStudents.map((s) => {
            const pendingRequest = (examRequests ?? []).find(
              (r: { student_profile_id: string; status: string }) =>
                r.student_profile_id === s.studentId && r.status === "pending",
            );
            return (
              <li key={s.enrollmentId} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-xs font-semibold text-accent">
                      {s.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <Link href={`/teacher/students/${s.studentId}`} className="block truncate text-sm font-medium hover:text-accent">{s.name}</Link>
                      {studentParentMap.get(s.studentId)?.length ? (
                        <div className="truncate text-xs text-muted">
                          {studentParentMap.get(s.studentId)!.map((pp) => pp.parentPhone ? `${pp.parentName} · ${pp.parentPhone}` : pp.parentName).join(", ")}
                        </div>
                      ) : (
                        <div className="text-xs text-muted">{t("noParents")}</div>
                      )}
                    </div>
                  </div>
                  {pendingRequest ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs rounded-full bg-info-subtle text-info-fg px-2.5 py-0.5 font-semibold">
                        {t("testReady")}
                      </span>
                      <ActionForm action={examCancelAction} successMessage={t("requestCancelled")}>
                        <input type="hidden" name="request_id" value={pendingRequest.id} />
                        <button
                          type="submit"
                          className={buttonVariants({ variant: "destructive", size: "sm" })}
                        >
                          {t("cancelRequest")}
                        </button>
                      </ActionForm>
                    </div>
                  ) : (
                    <details className="shrink-0 text-right">
                      <summary className={cn(buttonVariants({ variant: "outline", size: "sm" }), "list-none [&::-webkit-details-marker]:hidden")}>
                        {t("markTestReady")}
                      </summary>
                      <div className="mt-2 w-64 text-left">
                        <ActionForm
                          action={examRequestAction}
                          successMessage={t("requestSubmitted")}
                          className="flex flex-col gap-2"
                        >
                          <input type="hidden" name="student_profile_id" value={s.studentId} />
                          <textarea
                            name="notes"
                            rows={2}
                            placeholder={t("testReadinessNotes")}
                            className={inputCls}
                          />
                          <button
                            type="submit"
                            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "self-start")}
                          >
                            {t("markTestReady")}
                          </button>
                        </ActionForm>
                      </div>
                    </details>
                  )}
                </div>
              </li>
            );
          })}
          {enrolledStudents.length === 0 ? (
            <li className="p-4 text-sm text-muted">
              {tAdmin("noStudentsEnrolled")}
            </li>
          ) : null}
        </ul>

        {enrolledStudents.length > 0 && (
          <BulkExamForm
            students={enrolledStudents.map((s) => ({
              studentId: s.studentId,
              name: s.name,
              hasPending: !!(examRequests ?? []).find(
                (r: { student_profile_id: string; status: string }) =>
                  r.student_profile_id === s.studentId && r.status === "pending",
              ),
            }))}
            action={bulkExamAction}
            label={t("bulkMarkTestReady")}
            notesLabel={t("testReadinessNotes")}
            submitLabel={t("markTestReady")}
          />
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <CollapsibleAddCard buttonLabel={t("addStudent")} className="has-[form]:basis-full">
            <div className="rounded-xl border border-card-border bg-card p-5">
            <TeacherCreateStudentForm action={studentAction} baseUrl={baseUrl} qrEnabled={qrEnabled} />
          </div>
          </CollapsibleAddCard>
          {enrolledStudents.length > 0 ? (
          <CollapsibleAddCard buttonLabel={t("addParent")} className="has-[form]:basis-full">
            <div className="rounded-xl border border-card-border bg-card p-5">
              <TeacherCreateParentForm action={parentAction} students={enrolledStudents} baseUrl={baseUrl} qrEnabled={qrEnabled} />
            </div>
          </CollapsibleAddCard>
          ) : null}
        </div>
      </section>

      </>) : null}

      {activeTab === "hifz" ? (<>
      {/* ----------------------------------------------------------- Hifz */}
      {isHifzGroup && enrolledStudents.length > 0 && (
        <section className="space-y-4">
          <HifzTracker
            groupId={groupId}
            students={enrolledStudents.map((s) => ({
              id: s.studentId,
              name: s.name,
              pagesMemorized: hifzMap.get(s.studentId)?.pages ?? 0,
              notes: hifzMap.get(s.studentId)?.notes ?? null,
            }))}
            upsertAction={upsertHifzProgressTeacher}
            labels={{
              title: t("hifzProgress"),
              pages: t("hifzPages"),
              juz: t("hifzJuz"),
              progress: t("hifzProgressLabel"),
              save: tAdmin("save"),
              notes: tAdmin("notesOptional"),
              noStudents: tAdmin("noStudentsEnrolled"),
              outOf: t("hifzOutOf"),
            }}
          />
        </section>
      )}

      </>) : null}

      {activeTab === "homework" ? (<>
      {/* ----------------------------------------------------------- Homework */}
      <section className="space-y-4">
        <CollapsibleAddCard buttonLabel={tAdmin("newHomework")}>
        <ActionForm
          action={homeworkAction}
          successMessage={tAdmin("homeworkPublished")}
          className="flex flex-col gap-3 rounded-xl border border-card-border bg-card p-5"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input
              name="title"
              required
              placeholder={tAdmin("title")}
              className={inputCls}
            />
            <input
              type="date"
              name="due_date"
              defaultValue={nextSessionDate}
              className={inputCls}
            />
          </div>
          <textarea
            name="body"
            rows={3}
            placeholder={tAdmin("instructionsOpt")}
            className={inputCls}
          />
          <label className="block">
            <span className="text-sm font-medium">{tAdmin("relatedLessonOpt")}</span>
            <select
              name="lesson_id"
              defaultValue=""
              className={cn(inputCls, "mt-1")}
            >
              <option value="">{tAdmin("noneFreeForm")}</option>
              {(lessons ?? []).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="group/audience rounded-xl border border-card-border p-3">
            <legend className="px-1 text-sm font-medium">{tAdmin("audience")}</legend>
            <label className="mr-4 inline-flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="audience"
                value="group"
                defaultChecked
                className="accent-accent"
              />
              {tAdmin("wholeGroup")}
            </label>
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="audience"
                id="audience-individual"
                value="individual"
                className="accent-accent"
              />
              {tAdmin("specificStudents")}
            </label>
            <div className="hidden group-has-[#audience-individual:checked]/audience:grid mt-3 grid-cols-1 md:grid-cols-2 gap-1">
              {enrolledStudents.map((s) => (
                <label key={s.studentId} className="inline-flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" name="student_ids" value={s.studentId} className="accent-accent" />
                  {s.name}
                </label>
              ))}
              {enrolledStudents.length === 0 ? (
                <p className="text-sm text-muted">{tAdmin("enrollFirstTarget")}</p>
              ) : null}
            </div>
          </fieldset>
          <button className={cn(buttonVariants({ size: "xl" }), "self-start")}>
            {tAdmin("publishHomework")}
          </button>
        </ActionForm>
        </CollapsibleAddCard>

        <ul className={listCard}>
          {(homework ?? []).map((h) => {
            const lesson = h.lessons as { title: string } | null;
            const targets = (h.homework_targets ?? []) as Array<{
              student_profile_id: string;
              student_profiles: { full_name: string } | null;
            }>;
            const submissionCount = (h.homework_submissions ?? []).length;
            const totalCount =
              h.audience === "group" ? enrolledStudents.length : targets.length;
            return (
              <li key={h.id} className="px-4 py-3.5 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{h.title}</span>
                  <span
                    className={`text-xs rounded-full px-2.5 py-0.5 font-semibold ${
                      h.audience === "group"
                        ? "bg-info-subtle text-info-fg"
                        : "bg-warning-subtle text-warning-fg"
                    }`}
                  >
                    {h.audience === "group" ? tAdmin("wholeGroup") : tAdmin("specificStudents")}
                  </span>
                  {h.audience === "individual" && targets.length === 0 ? (
                    <span
                      className="text-xs rounded-full bg-danger-subtle px-2.5 py-0.5 font-semibold text-danger-fg"
                      title={tAdmin("noTargetsSelectedHint")}
                    >
                      {tAdmin("noTargetsSelected")}
                    </span>
                  ) : null}
                  {lesson ? (
                    <span className="text-xs rounded-full bg-accent-subtle px-2.5 py-0.5 font-semibold text-accent">
                      {lesson.title}
                    </span>
                  ) : null}
                  {h.due_date ? (
                    <span className="text-xs text-muted">{tAdmin("due")} {formatDateShort(h.due_date, locale)}</span>
                  ) : null}
                  {totalCount > 0 ? (
                    <span
                      className={`text-xs rounded-full px-2.5 py-0.5 font-semibold tabular-nums ${
                        submissionCount >= totalCount
                          ? "bg-success-subtle text-success-fg"
                          : "bg-surface text-muted"
                      }`}
                    >
                      {t("acknowledged")} {submissionCount}/{totalCount}
                    </span>
                  ) : null}
                </div>
                {h.body ? <div className="text-sm text-muted">{h.body}</div> : null}
                {h.audience === "individual" && targets.length > 0 ? (
                  <div className="text-xs text-muted">
                    {tAdmin("for")}{" "}
                    {targets.map((tg) => tg.student_profiles?.full_name ?? "—").join(", ")}
                  </div>
                ) : null}

                {/* Submission breakdown */}
                {totalCount > 0 ? (() => {
                  const submittedIds = new Set(
                    (h.homework_submissions as Array<{ id: string; student_profile_id: string }> ?? []).map((s) => s.student_profile_id)
                  );
                  const relevantStudents = h.audience === "group"
                    ? enrolledStudents
                    : enrolledStudents.filter((s) => targets.some((tg) => tg.student_profile_id === s.studentId));
                  const notDone = relevantStudents.filter((s) => !submittedIds.has(s.studentId));
                  if (notDone.length === 0) return null;
                  return (
                    <div className="text-xs text-muted">
                      {t("notYetAcknowledged")}: {notDone.map((s) => s.name).join(", ")}
                    </div>
                  );
                })() : null}

                {/* Edit / delete */}
                <details className="text-sm">
                  <summary className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-fit list-none text-muted [&::-webkit-details-marker]:hidden")}>
                    {t("edit")}
                  </summary>
                  <div className="mt-3 space-y-3 border-t border-card-border pt-3">
                    <ActionForm
                      action={updateHomework}
                      successMessage={t("homeworkUpdated")}
                      resetOnSuccess={false}
                      className="flex flex-col gap-2"
                    >
                      <input type="hidden" name="homework_id" value={h.id} />
                      <input type="hidden" name="group_id" value={groupId} />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <input
                          name="title"
                          required
                          defaultValue={h.title}
                          placeholder={tAdmin("title")}
                          className={inputCls}
                        />
                        <input
                          type="date"
                          name="due_date"
                          defaultValue={h.due_date ?? ""}
                          className={inputCls}
                        />
                      </div>
                      <textarea
                        name="body"
                        rows={2}
                        defaultValue={h.body ?? ""}
                        placeholder={tAdmin("instructionsOpt")}
                        className={inputCls}
                      />
                      <select
                        name="lesson_id"
                        defaultValue={h.lesson_id ?? ""}
                        className={inputCls}
                      >
                        <option value="">{tAdmin("noneFreeForm")}</option>
                        {(lessons ?? []).map((l) => (
                          <option key={l.id} value={l.id}>{l.title}</option>
                        ))}
                      </select>
                      <button className={cn(buttonVariants({ size: "sm" }), "self-start")}>
                        {tAdmin("saveChanges")}
                      </button>
                    </ActionForm>
                    <ActionForm action={deleteHomework} successMessage={t("homeworkDeleted")}>
                      <input type="hidden" name="homework_id" value={h.id} />
                      <input type="hidden" name="group_id" value={groupId} />
                      <button className={buttonVariants({ variant: "destructive", size: "sm" })}>
                        {t("deleteHomework")}
                      </button>
                    </ActionForm>
                  </div>
                </details>
              </li>
            );
          })}
          {!homework || homework.length === 0 ? (
            <li className="p-4 text-sm text-muted">{tAdmin("noHomework")}</li>
          ) : null}
        </ul>
      </section>

      </>) : null}

      {activeTab === "notes" ? (
        <div className="space-y-8">
      {/* -------------------------------------------------------- Progress notes */}
      <section className="space-y-3">
        <SectionHeader title={t("progressNotes")} />
        <CollapsibleAddCard buttonLabel={t("addNote")}>
        <ActionForm
          action={noteAction}
          successMessage={t("noteAdded")}
          className="flex flex-col gap-3 rounded-xl border border-card-border bg-card p-5"
        >
          <label className="block">
            <span className="text-sm font-medium">{t("student")}</span>
            <select
              name="student_profile_id"
              required
              defaultValue=""
              className={cn(inputCls, "mt-1")}
            >
              <option value="" disabled>{tAdmin("selectStudent")}</option>
              {enrolledStudents.map((s) => (
                <option key={s.studentId} value={s.studentId}>{s.name}</option>
              ))}
            </select>
          </label>
          <textarea
            name="body"
            required
            rows={3}
            placeholder={t("notePlaceholder")}
            className={inputCls}
          />
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" name="visible_to_parents" defaultChecked />
            {t("visibleToParents")}
          </label>
          <button
            disabled={enrolledStudents.length === 0}
            className={cn(buttonVariants({ size: "xl" }), "self-start")}
          >
            {t("saveNote")}
          </button>
        </ActionForm>
        </CollapsibleAddCard>

        <ul className={listCard}>
          {(notes ?? []).map((n) => {
            const sp = n.student_profiles as { full_name: string } | null;
            return (
              <li key={n.id} className="p-4 space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{sp?.full_name ?? "—"}</span>
                  <span className="text-xs text-muted">
                    {formatDateShort(n.created_at, locale)}
                    {!n.visible_to_parents ? ` · ${t("internalOnly")}` : ""}
                  </span>
                </div>
                <div className="text-sm text-muted">{n.body}</div>

                {/* Edit / delete — only the author, matching the server
                    actions' author scoping. Other teachers' notes render
                    read-only. */}
                {n.author_profile_id === ctx.userId ? (
                  <details className="text-sm">
                    <summary className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-fit list-none text-muted [&::-webkit-details-marker]:hidden")}>
                      {t("edit")}
                    </summary>
                    <div className="mt-2 space-y-2 border-t border-card-border pt-2">
                      <ActionForm
                        action={updateNote}
                        successMessage={t("noteUpdated")}
                        resetOnSuccess={false}
                        className="flex flex-col gap-2"
                      >
                        <input type="hidden" name="note_id" value={n.id} />
                        <input type="hidden" name="group_id" value={groupId} />
                        <textarea
                          name="body"
                          required
                          rows={2}
                          defaultValue={n.body}
                          className={inputCls}
                        />
                        <label className="inline-flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            name="visible_to_parents"
                            defaultChecked={n.visible_to_parents}
                          />
                          {t("visibleToParents")}
                        </label>
                        <button className={cn(buttonVariants({ size: "sm" }), "self-start")}>
                          {tAdmin("saveChanges")}
                        </button>
                      </ActionForm>
                      <ActionForm action={deleteNote} successMessage={t("noteDeleted")}>
                        <input type="hidden" name="note_id" value={n.id} />
                        <input type="hidden" name="group_id" value={groupId} />
                        <button className={buttonVariants({ variant: "destructive", size: "sm" })}>
                          {t("deleteNote")}
                        </button>
                      </ActionForm>
                    </div>
                  </details>
                ) : null}
              </li>
            );
          })}
          {!notes || notes.length === 0 ? (
            <li className="p-4 text-sm text-muted">{t("noNotes")}</li>
          ) : null}
        </ul>
      </section>

      {/* ------------------------------------------------------- Weekly notes */}
      <section className="space-y-3">
        <SectionHeader title={t("weeklyNotes")} />
        <CollapsibleAddCard buttonLabel={t("writeWeeklyNote")}>
        <ActionForm
          action={weeklyNoteAction}
          successMessage={t("weeklySaved")}
          resetOnSuccess={false}
          className="flex flex-col gap-3 rounded-xl border border-card-border bg-card p-5"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <label className="block">
              <span className="text-sm font-medium">{t("weekOf")}</span>
              <input
                type="date"
                name="week_start"
                required
                defaultValue={today}
                className={cn(inputCls, "mt-1")}
              />
            </label>
            <label className="inline-flex items-center gap-2 text-sm self-end pb-2">
              <input type="checkbox" name="is_published" />
              {tAdmin("publish")}
            </label>
          </div>
          <textarea
            name="body"
            required
            rows={4}
            placeholder={t("weeklySummaryPlaceholder")}
            className={inputCls}
          />
          <button className={cn(buttonVariants({ size: "xl" }), "self-start")}>
            {t("saveWeeklySummary")}
          </button>
        </ActionForm>
        </CollapsibleAddCard>

        <ul className={listCard}>
          {(weeklyNotes ?? []).map((wn) => (
            <li key={wn.id} className="p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t("weekOf")} {formatDate(wn.week_start, locale, { day: "numeric", month: "short", year: "numeric" })}</span>
                {wn.is_published ? (
                  <span className="text-xs rounded-full bg-success-subtle text-success-fg px-2.5 py-0.5 font-semibold">
                    {tAdmin("published")}
                  </span>
                ) : (
                  <span className="text-xs rounded-full bg-surface text-muted px-2.5 py-0.5 font-semibold">
                    {tAdmin("draft")}
                  </span>
                )}
              </div>
              <div className="text-sm text-muted whitespace-pre-line">{wn.body}</div>
            </li>
          ))}
          {!weeklyNotes || weeklyNotes.length === 0 ? (
            <li className="p-4 text-sm text-muted">{t("noWeeklyNotes")}</li>
          ) : null}
        </ul>
      </section>
        </div>
      ) : null}

      {activeTab === "lessons" ? (<>
      {/* -------------------------------------------------- Upcoming lessons */}
      <section className="space-y-4">
        <p className="text-sm text-muted">{t("upcomingLessonsDesc")}</p>
        <ul className={listCard}>
          {(upcomingSessions ?? []).map((s) => {
            const cancelled = s.is_cancelled;
            return (
              <li key={s.id} className="px-4 py-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-medium text-sm ${cancelled ? "text-muted line-through" : ""}`}>
                      {formatDate(s.date, locale, { weekday: "long", day: "numeric", month: "long" })}
                    </span>
                    <span className="text-xs text-muted">
                      {s.start_time?.slice(0, 5)}–{s.end_time?.slice(0, 5)}
                    </span>
                    {cancelled ? (
                      <span className="text-xs rounded-full bg-danger-subtle text-danger-fg px-2.5 py-0.5 font-semibold">
                        {tAdmin("cancelled")}
                      </span>
                    ) : null}
                  </div>
                  {cancelled ? (
                    <ActionForm action={cancelLessonAction} successMessage={t("lessonRestored")}>
                      <input type="hidden" name="session_id" value={s.id} />
                      <input type="hidden" name="group_id" value={groupId} />
                      <input type="hidden" name="is_cancelled" value="false" />
                      <button
                        type="submit"
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        {t("restoreLesson")}
                      </button>
                    </ActionForm>
                  ) : (
                    <details className="group/cancel text-right">
                      <summary className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "list-none text-muted hover:text-danger-fg [&::-webkit-details-marker]:hidden")}>
                        {t("cancelLesson")}
                      </summary>
                    <ActionForm
                      action={cancelLessonAction}
                      successMessage={t("lessonCancelledNotified")}
                      className="mt-2 flex flex-wrap items-center justify-end gap-2"
                    >
                      <input type="hidden" name="session_id" value={s.id} />
                      <input type="hidden" name="group_id" value={groupId} />
                      <input type="hidden" name="is_cancelled" value="true" />
                      <input
                        name="notes"
                        placeholder={t("cancelReason")}
                        className={cn(inputCls, "h-8 w-auto py-1.5 text-[0.8125rem]")}
                      />
                      <button
                        type="submit"
                        className={buttonVariants({ variant: "destructive", size: "sm" })}
                      >
                        {t("cancelLesson")}
                      </button>
                    </ActionForm>
                    </details>
                  )}
                </div>
                {s.notes ? <p className="text-sm text-muted whitespace-pre-wrap">{s.notes}</p> : null}
              </li>
            );
          })}
          {!upcomingSessions || upcomingSessions.length === 0 ? (
            <li className="p-4 text-sm text-muted">{t("noUpcomingLessons")}</li>
          ) : null}
        </ul>
      </section>

      </>) : null}
    </div>
  );
}
