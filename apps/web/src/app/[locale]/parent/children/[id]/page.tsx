import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { Heart, BookHeart } from "lucide-react";

import { requireParent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/ActionForm";
import { AttendanceGrid, type AttendanceDot } from "@/components/AttendanceGrid";
import { PageHeader } from "@/components/PageHeader";
import { HifzProgressMap } from "@/components/HifzProgressMap";

import { acknowledgeHomework } from "./actions";
import { acceptExamSchedule, counterExamSchedule, cancelExamSession } from "../../../exam-actions";
import { buttonVariants } from "@/components/ui/button";
import { formatDate, formatDateShort } from "@/lib/format";
import { listCard } from "@/components/ui/surfaces";

type PageProps = {
  params: Promise<{ id: string }>;
};

function homeworkUrgency(dueDate: string | null): "overdue" | "soon" | "later" | "none" {
  if (!dueDate) return "none";
  const diff = new Date(dueDate).getTime() - Date.now();
  if (diff < 0) return "overdue";
  if (diff < 3 * 24 * 60 * 60 * 1000) return "soon";
  return "later";
}

const URGENCY_BADGE: Record<string, string> = {
  overdue: "bg-danger-subtle text-danger-fg",
  soon:    "bg-warning-subtle text-warning-fg",
  later:   "bg-card-border text-muted",
  none:    "bg-card-border text-muted",
};

export default async function ParentChildDetail({ params }: PageProps) {
  const locale = await getLocale();
  const { id: studentId } = await params;
  const ctx = await requireParent();
  const t = await getTranslations("Parent");
  const tAdmin = await getTranslations("Admin");
  const supabase = await createClient();

  const hifzMapLabels = {
    title: t("hifzProgress"),
    pages: t("hifzPages"),
    juz: t("hifzJuz"),
    memorized: t("hifzMemorized"),
    complete: t("hifzComplete"),
  };

  // 1. Auth check + student name — sequential since everything depends on studentId validity
  const [{ data: link }, { data: student }] = await Promise.all([
    supabase
      .from("parent_student_links")
      .select("id")
      .eq("parent_profile_id", ctx.parentProfileId)
      .eq("student_profile_id", studentId)
      .maybeSingle(),
    supabase
      .from("student_profiles")
      .select("id, full_name, date_of_birth")
      .eq("id", studentId)
      .maybeSingle(),
  ]);
  if (!link || !student) notFound();

  // 2. All secondary data in parallel
  const [
    { data: enrollments },
    { data: attendanceRaw },
    { data: attendanceStatsRaw },
    { data: individualTargets },
    { data: notes },
  ] = await Promise.all([
    supabase
      .from("group_enrollments")
      .select("id, group_id, groups(id, name, description, group_categories(is_hifz))")
      .eq("student_profile_id", studentId)
      .eq("is_active", true),
    supabase
      .from("attendance_records")
      .select("id, status, note, attendance_sessions(id, session_date, group_id, groups(name))")
      .eq("student_profile_id", studentId)
      .order("created_at", { ascending: false })
      .limit(90),
    // Full-count stats for the summary strip (the list above is limited).
    supabase
      .from("attendance_records")
      .select("status")
      .eq("student_profile_id", studentId),
    supabase
      .from("homework_targets")
      .select("homework_id, homework_assignments(id, title, body, due_date, audience, group_id, is_published, groups(name))")
      .eq("student_profile_id", studentId),
    supabase
      .from("progress_notes")
      .select("id, body, created_at, group_id, groups(name)")
      .eq("student_profile_id", studentId)
      .eq("visible_to_parents", true)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const groups = (enrollments ?? [])
    .map((e) => e.groups as { id: string; name: string; description: string | null; group_categories: { is_hifz: boolean } | null } | null)
    .filter((g): g is NonNullable<typeof g> => g !== null);

  const groupIds = groups.map((g) => g.id);
  const hifzGroupIds = groups.filter((g) => g.group_categories?.is_hifz).map((g) => g.id);

  // Everything below depends only on the groups (or on nothing) — fetch it
  // in one round trip instead of five sequential ones.
  const [
    { data: hifzProgressRows },
    { data: groupHomework },
    { data: submissions },
    { data: examSessionsRaw },
    { data: pastExamsRaw },
  ] = await Promise.all([
    hifzGroupIds.length
    ? supabase
        .from("hifz_progress")
        .select("group_id, pages_memorized, notes, groups(name)")
        .eq("student_profile_id", studentId)
        .in("group_id", hifzGroupIds)
    : { data: null },
    groupIds.length
    ? supabase
        .from("homework_assignments")
        .select("id, title, body, due_date, audience, group_id, groups(name)")
        .in("group_id", groupIds)
        .eq("is_published", true)
        .eq("audience", "group")
        .order("due_date", { ascending: false, nullsFirst: false })
        .limit(30)
    : { data: [] as Array<{ id: string; title: string; body: string | null; due_date: string | null; audience: string; group_id: string; groups: { name: string } | null }> },
    supabase
      .from("homework_submissions")
      .select("homework_id, acknowledged_at")
      .eq("student_profile_id", studentId),
    supabase
      .from("exam_sessions")
      .select("id, status, schedule_status, proposed_date, proposed_by, exam_date")
      .eq("student_profile_id", studentId)
      .in("schedule_status", ["proposed", "counter_proposed", "confirmed"])
      .order("created_at", { ascending: false }),
    supabase
    .from("exam_sessions")
    .select("id, status, exam_date, summary")
    .eq("student_profile_id", studentId)
    .in("status", ["passed", "failed", "cancelled"])
    .order("created_at", { ascending: false })
    .limit(20),
  ]);

  const individualHomework = (individualTargets ?? [])
    .map((t) => t.homework_assignments as { id: string; title: string; body: string | null; due_date: string | null; audience: string; group_id: string; is_published: boolean; groups: { name: string } | null } | null)
    .filter((h): h is NonNullable<typeof h> => h !== null && h.is_published);

  const homework = [...(groupHomework ?? []), ...individualHomework].sort((a, b) => {
    if (!a.due_date && !b.due_date) return 0;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date < b.due_date ? 1 : -1;
  });

  const acknowledgedSet = new Set((submissions ?? []).map((s) => s.homework_id));

  const examSessions = ((examSessionsRaw ?? []) as unknown) as Array<{
    id: string;
    status: string;
    schedule_status: string;
    proposed_date: string | null;
    proposed_by: string | null;
    exam_date: string;
  }>;
  // 3. Group homework (needs groupIds from step 2)

  const pastExams = ((pastExamsRaw ?? []) as unknown) as Array<{
    id: string;
    status: string;
    exam_date: string;
    summary: string | null;
  }>;

  // Attendance dots for the visual grid
  const dots: AttendanceDot[] = (attendanceRaw ?? []).map((r) => {
    const session = r.attendance_sessions as { id: string; session_date: string; group_id: string; groups: { name: string } | null } | null;
    return {
      id: r.id,
      status: r.status,
      date: session?.session_date ?? "",
      groupName: session?.groups?.name,
      note: r.note,
    };
  }).filter((d) => d.date);

  // Full-count stats for the summary strip (the list above is limited to 90).
  const statsTotal = (attendanceStatsRaw ?? []).length;
  const statsPresent = (attendanceStatsRaw ?? []).filter((r) => r.status === "present").length;
  const statsLate = (attendanceStatsRaw ?? []).filter((r) => r.status === "late").length;
  const statsAbsent = (attendanceStatsRaw ?? []).filter((r) => r.status === "absent").length;
  const statsExcused = (attendanceStatsRaw ?? []).filter((r) => r.status === "excused").length;
  const statsAttended = statsPresent + statsLate;
  const statsRate = statsTotal > 0 ? Math.round((statsAttended / statsTotal) * 100) : null;

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        icon={<Heart className="h-5 w-5" />}
        title={student.full_name}
        breadcrumbs={[
          { href: "/parent", label: t("overview") },
          { href: "/parent/children", label: t("myChildren") },
          { label: student.full_name },
        ]}
      />

      {/* Groups */}
      {groups.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-base font-semibold tracking-tight">{t("groups")}</h2>
          <div className="flex flex-wrap gap-2">
            {groups.map((g) => (
              <span key={g.id} className="rounded-full border border-card-border bg-card px-3 py-1 text-sm">
                {g.name}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {/* Homework */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">{t("homework")}</h2>
        {homework.length === 0 ? (
          <p className="text-sm text-muted">{t("noHomework")}</p>
        ) : (
          <ul className={listCard}>
            {homework.map((h) => {
              const isAcknowledged = acknowledgedSet.has(h.id);
              const ackAction = acknowledgeHomework.bind(null, studentId, h.id);
              const urgency = homeworkUrgency(h.due_date);
              return (
                <li key={h.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-medium text-sm leading-snug">{h.title}</div>
                    {h.due_date ? (
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${URGENCY_BADGE[urgency]}`}>
                        {urgency === "overdue"
                          ? tAdmin("overdue")
                          : `${tAdmin("due")} ${formatDate(h.due_date, locale, { month: "short", day: "numeric" })}`}
                      </span>
                    ) : null}
                  </div>
                  {h.body ? (
                    <p className="text-sm text-muted whitespace-pre-wrap">{h.body}</p>
                  ) : null}
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs text-muted">
                      {h.groups?.name}
                      {h.audience === "individual" ? ` · ${t("individual")}` : ""}
                    </div>
                    {isAcknowledged ? (
                      <span className="inline-flex h-8 items-center gap-1.5 text-xs rounded-full bg-success-subtle text-success-fg px-3 font-semibold">
                        {t("acknowledged")}
                      </span>
                    ) : (
                      <ActionForm action={ackAction} successMessage={t("acknowledged")}>
                        <button className={buttonVariants({ size: "sm" })}>
                          {t("acknowledge")}
                        </button>
                      </ActionForm>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Hifz progress */}
      {(hifzProgressRows ?? []).length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold tracking-tight flex items-center gap-2">
            <BookHeart className="h-4 w-4 text-success-fg" />
            {t("hifzProgress")}
          </h2>
          <div className="space-y-3">
            {(hifzProgressRows ?? []).map((row) => (
              <HifzProgressMap
                key={row.group_id}
                pagesMemorized={row.pages_memorized}
                groupName={(row.groups as { name: string } | null)?.name}
                notes={row.notes as string | null}
                labels={hifzMapLabels}
              />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming exams */}
      {examSessions.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-base font-semibold tracking-tight">{t("upcomingExams")}</h2>
          <ul className={listCard}>
            {examSessions.map((es) => {
              const canAct =
                es.schedule_status === "proposed" ||
                (es.schedule_status === "counter_proposed" && es.proposed_by !== "parent");
              return (
                <li key={es.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      {es.schedule_status === "confirmed" ? (
                        <div className="text-sm font-medium">
                          {t("examConfirmed")}: {formatDateShort(es.exam_date, locale)}
                        </div>
                      ) : (
                        <div className="text-sm font-medium">
                          {t("proposedFor")}: {(es.proposed_date ? formatDateShort(es.proposed_date, locale) : "—")}
                        </div>
                      )}
                      {es.proposed_by ? (
                        <div className="text-xs text-muted">
                          {t("counterProposalFrom")}: {es.proposed_by}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  {canAct ? (
                    <div className="flex flex-wrap items-end gap-3">
                      <ActionForm
                        action={acceptExamSchedule.bind(null, es.id)}
                        successMessage={t("acknowledged")}
                      >
                        <button
                          type="submit"
                          className={buttonVariants({ size: "sm" })}
                        >
                          {t("acceptDate")}
                        </button>
                      </ActionForm>
                      <ActionForm
                        action={counterExamSchedule.bind(null, es.id)}
                        successMessage={t("acknowledged")}
                        className="flex items-end gap-2"
                      >
                        <label className="block text-xs">
                          <span className="block text-muted">{t("counterPropose")}</span>
                          <input
                            type="date"
                            name="counter_date"
                            required
                            className="rounded-lg border border-card-border bg-background px-2 py-1 text-xs"
                          />
                        </label>
                        <button
                          type="submit"
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                        >
                          {t("proposeDifferentDate")}
                        </button>
                      </ActionForm>
                      <ActionForm
                        action={cancelExamSession.bind(null, es.id)}
                        successMessage={t("examCancelled")}
                      >
                        <button
                          type="submit"
                          className={buttonVariants({ variant: "destructive", size: "sm" })}
                        >
                          {t("cancelExam")}
                        </button>
                      </ActionForm>
                    </div>
                  ) : (
                    <div className="text-xs text-muted">{t("awaitingResponse")}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {/* Past exams */}
      {pastExams.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold tracking-tight">{t("examHistory")}</h2>
          <ul className={listCard}>
            {pastExams.map((es) => (
              <li key={es.id} className="p-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{formatDateShort(es.exam_date, locale)}</span>
                  <span
                    className={`text-xs rounded-full px-2.5 py-0.5 font-medium ${
                      es.status === "passed"
                        ? "bg-success-subtle text-success-fg"
                        : es.status === "cancelled"
                        ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        : "bg-danger-subtle text-danger-fg"
                    }`}
                  >
                    {es.status === "passed"
                      ? "✔"
                      : es.status === "cancelled"
                      ? t("examCancelled")
                      : "✗"}
                  </span>
                </div>
                {es.summary ? (
                  <p className="text-xs text-muted mt-1 whitespace-pre-wrap">{es.summary}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Attendance */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">{t("attendance")}</h2>
        {dots.length > 0 ? (
          <>
            <AttendanceGrid dots={dots} locale={locale} />
            {/* Detail list */}
            <ul className={listCard}>
              {(attendanceRaw ?? []).slice(0, 20).map((r) => {
                const session = r.attendance_sessions as { id: string; session_date: string; group_id: string; groups: { name: string } | null } | null;
                const statusClass: Record<string, string> = {
                  present: "bg-success-subtle text-success-fg",
                  absent:  "bg-danger-subtle text-danger-fg",
                  late:    "bg-warning-subtle text-warning-fg",
                  excused: "bg-info-subtle text-info-fg",
                };
                return (
                  <li key={r.id} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium">
                        {session?.session_date
                          ? formatDate(session.session_date, locale, { weekday: "short", month: "short", day: "numeric" })
                          : "—"}
                      </div>
                      <div className="text-xs text-muted">{session?.groups?.name}</div>
                      {r.note ? <div className="text-xs text-muted mt-0.5 italic">{r.note}</div> : null}
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass[r.status] ?? "bg-card-border text-muted"}`}>
                      {tAdmin(r.status)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="text-sm text-muted">{t("noAttendance")}</p>
        )}
      </section>

      {/* Progress notes */}
      {(notes ?? []).length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-base font-semibold tracking-tight">{t("progressNotes")}</h2>
          <ul className={listCard}>
            {(notes ?? []).map((n) => {
              const group = n.groups as { name: string } | null;
              return (
                <li key={n.id} className="p-4 space-y-1">
                  <div className="text-sm whitespace-pre-wrap">{n.body}</div>
                  <div className="text-xs text-muted">
                    {formatDate(n.created_at, locale, { year: "numeric", month: "short", day: "numeric" })}
                    {group ? ` · ${group.name}` : ""}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
