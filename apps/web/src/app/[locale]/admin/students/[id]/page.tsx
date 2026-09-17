import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { GraduationCap, TrendingUp, Trophy, ClipboardList, BookHeart } from "lucide-react";

import { Link } from "@/i18n/routing";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/ActionForm";
import { PageHeader } from "@/components/PageHeader";
import { HifzProgressMap } from "@/components/HifzProgressMap";
import { getMosqueConfig } from "@/lib/mosque-config";

import { ResetPasswordButton } from "./ResetPasswordButton";
import { LessonProgress } from "./LessonProgress";
import { DeleteStudentButton } from "./DeleteStudentButton";
import { LinkedParentsClient } from "./LinkedParentsClient";
import { formatDate } from "@/lib/format";
import { listCard } from "@/components/ui/surfaces";

type PageProps = { params: Promise<{ id: string }> };

export default async function StudentDetailPage({ params }: PageProps) {
  const { id: studentId } = await params;
  const ctx = await requireAdmin();
  const supabase = await createClient();
  const t = await getTranslations("Admin");
  const locale = await getLocale();

  const hifzMapLabels = {
    title: t("hifzProgress"),
    pages: t("hifzPages"),
    juz: t("hifzJuz"),
    memorized: t("hifzMemorized"),
    complete: t("hifzComplete"),
  };

  const { data: student } = await supabase
    .from("student_profiles")
    .select("id, full_name, date_of_birth, is_active, notes, profile_id")
    .eq("id", studentId)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();

  if (!student) notFound();

  const { schoolYearStart: since } = await getMosqueConfig(ctx.mosqueId);

  const [
    { data: enrollments },
    { data: parentLinks },
    { data: allParents },
    { data: allTopics },
    { data: allLessons },
    { data: completions },
    { data: homework },
    { data: studentAttendance },
    { data: studentExamSessions },
    { data: studentProgressNotes },
  ] = await Promise.all([
    supabase
      .from("group_enrollments")
      .select("id, groups(id, name, category_id, group_categories(id, name, is_hifz))")
      .eq("student_profile_id", studentId)
      .eq("is_active", true),
    supabase
      .from("parent_student_links")
      .select("id, parent_profile_id, parent_profiles(id, relation, profiles(full_name, display_name))")
      .eq("student_profile_id", studentId)
      .eq("mosque_id", ctx.mosqueId),
    supabase
      .from("parent_profiles")
      .select("id, relation, profiles(full_name, display_name)")
      .eq("mosque_id", ctx.mosqueId),
    supabase
      .from("topics")
      .select("id, title")
      .eq("mosque_id", ctx.mosqueId)
      .order("sort_order"),
    supabase
      .from("lessons")
      .select("id, title, topic_id")
      .eq("mosque_id", ctx.mosqueId)
      .order("sort_order"),
    supabase
      .from("lesson_completions")
      .select("lesson_id")
      .eq("student_profile_id", studentId)
      .eq("mosque_id", ctx.mosqueId),
    supabase
      .from("homework_assignments")
      .select("id, title, due_date, is_published, groups(name)")
      .eq("mosque_id", ctx.mosqueId)
      .eq("is_published", true)
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("attendance_records")
      .select("status, attendance_sessions!inner(session_date, group_id, groups(name))")
      .eq("student_profile_id", studentId)
      .gte("attendance_sessions.session_date", since)
      .order("attendance_sessions.session_date", { ascending: false }),
    supabase
      .from("exam_sessions")
      .select("id, status, summary, exam_date, oral_passed, written_passed, from_group_id, groups!exam_sessions_from_group_id_fkey(name)")
      .eq("student_profile_id", studentId)
      .in("status", ["passed", "failed"])
      .order("exam_date", { ascending: false }),
    supabase
      .from("progress_notes")
      .select("id, body, visible_to_parents, created_at, groups(name)")
      .eq("student_profile_id", studentId)
      .eq("mosque_id", ctx.mosqueId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const hifzGroupIds = (enrollments ?? [])
    .map((e) => {
      const g = e.groups as { id: string; group_categories: { is_hifz: boolean } | null } | null;
      return g?.group_categories?.is_hifz ? g.id : null;
    })
    .filter((id): id is string => id !== null);

  const { data: hifzProgressRows } = hifzGroupIds.length > 0
    ? await supabase
        .from("hifz_progress")
        .select("group_id, pages_memorized, notes, groups(name)")
        .eq("student_profile_id", studentId)
        .eq("mosque_id", ctx.mosqueId)
        .in("group_id", hifzGroupIds)
    : { data: null };

  const linkedParentIds = new Set(
    (parentLinks ?? []).map((l) => l.parent_profile_id),
  );
  const candidateParents = (allParents ?? []).filter(
    (p) => !linkedParentIds.has(p.id),
  );

  const completedSet = new Set(
    (completions ?? []).map((c) => c.lesson_id),
  );

  const enrolledGroupIds = new Set(
    (enrollments ?? []).map((e) => {
      const g = e.groups as { id: string } | null;
      return g?.id;
    }).filter(Boolean),
  );

  const studentHomework = (homework ?? []).filter(() => enrolledGroupIds.size > 0);

  const lessonsWithCompletion = (allLessons ?? []).map((l) => ({
    ...l,
    completed: completedSet.has(l.id),
  }));


  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        icon={<GraduationCap className="h-5 w-5" />}
        title={student.full_name}
        description={
          student.date_of_birth
            ? `${t("dateOfBirthOpt").replace(/ \(.*\)$/, "")}: ${student.date_of_birth}`
            : undefined
        }
        breadcrumbs={[
          { href: "/admin", label: t("overview") },
          { href: "/admin/students", label: t("students") },
          { label: student.full_name },
        ]}
        actions={
          <DeleteStudentButton
            studentId={studentId}
            deleteLabel={t("deleteStudent")}
            confirmDelete={t("confirmDeleteStudent")}
            cancelLabel={t("cancel")}
            studentsPath="/admin/students"
          />
        }
      />

      {!student.is_active ? (
        <span className="inline-block text-xs rounded-full bg-warning-subtle px-2.5 py-0.5 text-warning-fg">
          Inactive
        </span>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-base font-semibold tracking-tight">{t("enrolledGroups")}</h2>
        <ul className={listCard}>
          {(enrollments ?? []).map((e) => {
            const group = e.groups as { id: string; name: string } | null;
            return (
              <li key={e.id} className="p-4">
                {group ? (
                  <Link
                    href={`/admin/groups/${group.id}`}
                    className="font-medium hover:text-accent transition-colors"
                  >
                    {group.name}
                  </Link>
                ) : null}
              </li>
            );
          })}
          {!enrollments || enrollments.length === 0 ? (
            <li className="p-4 text-sm text-muted">{t("noGroupsEnrolled")}</li>
          ) : null}
        </ul>
      </section>

      {(hifzProgressRows ?? []).length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BookHeart className="h-5 w-5 text-success-fg" />
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

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">{t("lessonProgress")}</h2>
        <div className="rounded-xl border border-card-border bg-card p-4 sm:p-5">
          <LessonProgress
            studentId={studentId}
            topics={allTopics ?? []}
            lessons={lessonsWithCompletion}
          />
        </div>
      </section>

      {/* ── Student Progress since School Year Start ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight">{t("progressSinceYearStart")}</h2>
          <span className="text-xs text-muted">{t("sinceSchoolYear")}: {formatDate(since, locale, { month: "short", day: "numeric", year: "numeric" })}</span>
        </div>
        {(() => {
          const attRecords = (studentAttendance ?? []) as Array<{
            status: string;
            attendance_sessions: { session_date: string; group_id: string; groups: { name: string } | null };
          }>;
          const attPresent = attRecords.filter((r) => r.status === "present" || r.status === "late").length;
          const attRate = attRecords.length > 0 ? Math.round((attPresent / attRecords.length) * 100) : null;

          const examList = (studentExamSessions ?? []) as unknown as Array<{
            id: string;
            status: string;
            summary: string | null;
            exam_date: string | null;
            oral_passed: boolean | null;
            written_passed: boolean | null;
            from_group_id: string | null;
            groups: { name: string } | null;
          }>;
          const examPassed = examList.filter((e) => e.status === "passed").length;
          const examFailed = examList.filter((e) => e.status === "failed").length;

          const notes = (studentProgressNotes ?? []) as Array<{
            id: string;
            body: string;
            visible_to_parents: boolean;
            created_at: string;
            groups: { name: string } | null;
          }>;

          return (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="rounded-xl border border-card-border bg-card p-4 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-muted" />
                    <p className="text-xs font-medium text-muted">{t("attendanceRateYear")}</p>
                  </div>
                  {attRate !== null ? (
                    <>
                      <p className="text-2xl font-semibold text-accent">{attRate}%</p>
                      <div className="h-1.5 rounded-full bg-card-border/60 overflow-hidden">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${attRate}%` }} />
                      </div>
                      <p className="text-xs text-muted">{attPresent} / {attRecords.length}</p>
                    </>
                  ) : <p className="text-sm text-muted">{t("noDataYet")}</p>}
                </div>

                <div className="rounded-xl border border-card-border bg-card p-4 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Trophy className="h-3.5 w-3.5 text-muted" />
                    <p className="text-xs font-medium text-muted">{t("examResults")}</p>
                  </div>
                  {(examPassed + examFailed) > 0 ? (
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-semibold text-success-fg">&#10003;{examPassed}</span>
                      <span className="text-2xl font-semibold text-danger-fg">&#10007;{examFailed}</span>
                    </div>
                  ) : <p className="text-sm text-muted">{t("noDataYet")}</p>}
                </div>

                <div className="rounded-xl border border-card-border bg-card p-4 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <ClipboardList className="h-3.5 w-3.5 text-muted" />
                    <p className="text-xs font-medium text-muted">{t("lessonCompletionYear")}</p>
                  </div>
                  {(() => {
                    const totalL = (allLessons ?? []).length;
                    const completedL = completedSet.size;
                    const lRate = totalL > 0 ? Math.round((completedL / totalL) * 100) : null;
                    return lRate !== null ? (
                      <>
                        <p className="text-2xl font-semibold text-accent">{lRate}%</p>
                        <div className="h-1.5 rounded-full bg-card-border/60 overflow-hidden">
                          <div className="h-full rounded-full bg-accent" style={{ width: `${lRate}%` }} />
                        </div>
                        <p className="text-xs text-muted">{completedL} / {totalL} {t("lessonsCompleted")}</p>
                      </>
                    ) : <p className="text-sm text-muted">{t("noDataYet")}</p>;
                  })()}
                </div>
              </div>

              {examList.length > 0 && (
                <div className="rounded-xl border border-card-border overflow-hidden">
                  <div className="px-4 py-3 border-b border-card-border bg-card">
                    <h3 className="text-sm font-semibold">{t("examHistory")}</h3>
                  </div>
                  <ul className="divide-y divide-card-border">
                    {examList.map((e) => (
                      <li key={e.id} className="px-4 py-3 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${e.status === "passed" ? "bg-success-subtle text-success-fg" : "bg-danger-subtle text-danger-fg"}`}>
                            {e.status === "passed" ? t("examPassed") : t("examFailed")}
                          </span>
                          {e.exam_date && <span className="text-xs text-muted">{formatDate(e.exam_date, locale, { day: "numeric", month: "short", year: "numeric" })}</span>}
                          {e.groups && <span className="text-xs text-muted">— {(e.groups as { name: string }).name}</span>}
                        </div>
                        <div className="flex gap-3 text-xs text-muted">
                          {e.oral_passed !== null && <span>{t("oral")}: {e.oral_passed ? "✓" : "✗"}</span>}
                          {e.written_passed !== null && <span>{t("written")}: {e.written_passed ? "✓" : "✗"}</span>}
                        </div>
                        {e.summary && <p className="text-xs text-muted">{e.summary}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {attRecords.length > 0 && (
                <div className="rounded-xl border border-card-border overflow-hidden">
                  <div className="px-4 py-3 border-b border-card-border bg-card">
                    <h3 className="text-sm font-semibold">{t("attendanceHistory")}</h3>
                  </div>
                  <ul className="divide-y divide-card-border max-h-64 overflow-y-auto">
                    {attRecords.slice(0, 20).map((r, i) => {
                      const sess = r.attendance_sessions;
                      const groupName = (sess?.groups as { name: string } | null)?.name ?? "";
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
                        <li key={i} className="flex items-center justify-between px-4 py-2.5">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted">{formatDate(sess.session_date, locale, { day: "numeric", month: "short" })}</span>
                            {groupName && <span className="text-xs text-muted">— {groupName}</span>}
                          </div>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusCls}`}>
                            {statusLabel[r.status] ?? r.status}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {notes.length > 0 && (
                <div className="rounded-xl border border-card-border overflow-hidden">
                  <div className="px-4 py-3 border-b border-card-border bg-card">
                    <h3 className="text-sm font-semibold">{t("recentProgressNotes")}</h3>
                  </div>
                  <ul className="divide-y divide-card-border">
                    {notes.map((n) => (
                      <li key={n.id} className="px-4 py-3 space-y-1">
                        <div className="flex items-center gap-2 text-xs text-muted">
                          <span>{formatDate(n.created_at, locale, { day: "numeric", month: "short", year: "numeric" })}</span>
                          {n.groups && <span>— {(n.groups as { name: string }).name}</span>}
                          {n.visible_to_parents && <span className="rounded-full bg-accent-subtle text-accent px-1.5 py-0.5 text-[11px]">{t("visibleToParents")}</span>}
                        </div>
                        <p className="text-sm">{n.body}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })()}
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">{t("homework")}</h2>
        <ul className={listCard}>
          {studentHomework.map((h) => {
            const group = h.groups as { name: string } | null;
            const isOverdue = h.due_date && new Date(h.due_date) < new Date();
            return (
              <li key={h.id} className="p-4 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{h.title}</span>
                  {h.due_date ? (
                    <span className={`text-xs shrink-0 ${isOverdue ? "text-danger-fg" : "text-muted"}`}>
                      {t("due")}: {formatDate(h.due_date, locale, { month: "short", day: "numeric" })}
                    </span>
                  ) : null}
                </div>
                {group ? (
                  <div className="text-xs text-muted">{group.name}</div>
                ) : null}
              </li>
            );
          })}
          {studentHomework.length === 0 ? (
            <li className="p-4 text-sm text-muted">{t("noHomework")}</li>
          ) : null}
        </ul>
      </section>

      <LinkedParentsClient
        studentId={studentId}
        initialLinkedParents={(parentLinks ?? []).map((link) => {
          const parent = link.parent_profiles as {
            relation: string | null;
            profiles: { full_name: string | null; display_name: string | null } | null;
          } | null;
          return {
            linkId: link.id,
            parentProfileId: link.parent_profile_id,
            name: parent?.profiles?.display_name ?? parent?.profiles?.full_name ?? t("noName"),
            relation: parent?.relation ?? null,
          };
        })}
        allParents={(allParents ?? []).map((p) => {
          const profile = p.profiles as {
            full_name: string | null;
            display_name: string | null;
          } | null;
          return {
            id: p.id,
            name: profile?.display_name ?? profile?.full_name ?? t("noName"),
            relation: p.relation,
          };
        })}
      />

      <section className="space-y-2">
        <h2 className="text-base font-semibold tracking-tight">{t("resetPassword")}</h2>
        {student.profile_id ? (
          <ResetPasswordButton
            studentId={student.id}
            label={t("resetPassword")}
            resultLabel={t("passwordReset")}
          />
        ) : (
          <p className="text-sm text-muted">{t("noLoginAccount")}</p>
        )}
      </section>
    </div>
  );
}
