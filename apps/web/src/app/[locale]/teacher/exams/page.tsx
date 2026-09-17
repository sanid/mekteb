import { getLocale, getTranslations } from "next-intl/server";
import { ClipboardCheck } from "lucide-react";

import { requireTeacher } from "@/lib/auth";
import { requirePlugin } from "@/lib/plugins";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { formatDate, formatDateShort } from "@/lib/format";
import { listCard } from "@/components/ui/surfaces";

export default async function TeacherExamsPage() {
  const ctx = await requireTeacher();
  await requirePlugin(ctx.mosqueId, "exam_system", "/teacher");
  const t = await getTranslations("Teacher");
  const locale = await getLocale();
  const te = await getTranslations("Examiner");
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("teacher_profiles")
    .select("id")
    .eq("profile_id", ctx.userId)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();

  const teacherProfileId = profile?.id;

  const { data: requests } = teacherProfileId
    ? await supabase
        .from("exam_requests")
        .select(
          "id, status, notes, created_at, student_profiles(full_name), groups(name), exam_sessions(id, status, exam_date, oral_passed, written_passed, summary)",
        )
        .eq("requested_by", teacherProfileId)
        .eq("mosque_id", ctx.mosqueId)
        .order("created_at", { ascending: false })
    : { data: [] };

  // Lesson checklist per session, so the teacher can see which lessons were
  // ticked off (good) and which the student needs to repeat.
  const sessionIds = ((requests ?? []) as { exam_sessions: { id: string }[] | null }[])
    .flatMap((r) => r.exam_sessions ?? [])
    .map((s) => s.id);
  const [{ data: lessons }, { data: lessonChecks }] = await Promise.all([
    supabase
      .from("lessons")
      .select("id, title")
      .eq("mosque_id", ctx.mosqueId)
      .eq("is_published", true)
      .order("sort_order", { ascending: true }),
    sessionIds.length > 0
      ? supabase
          .from("exam_lesson_results")
          .select("exam_session_id, lesson_id")
          .in("exam_session_id", sessionIds)
      : Promise.resolve({ data: [] }),
  ]);
  const titleById = new Map(
    ((lessons ?? []) as { id: string; title: string }[]).map((l) => [l.id, l.title]),
  );
  const checksBySession = new Map<string, string[]>();
  for (const c of (lessonChecks ?? []) as { exam_session_id: string; lesson_id: string }[]) {
    const list = checksBySession.get(c.exam_session_id) ?? [];
    list.push(c.lesson_id);
    checksBySession.set(c.exam_session_id, list);
  }

  const statusColor = (s: string) => {
    switch (s) {
      case "passed":    return "bg-success-subtle text-success-fg";
      case "failed":    return "bg-danger-subtle text-danger-fg";
      case "in_progress": return "bg-info-subtle text-info-fg";
      case "scheduled": return "bg-accent-subtle text-accent";
      case "accepted":  return "bg-accent-subtle text-accent";
      case "pending":   return "bg-card-border text-muted";
      case "cancelled": return "bg-surface text-muted";
      default:          return "bg-card-border text-muted";
    }
  };

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      pending: te("requestStatus_pending"),
      accepted: te("requestStatus_accepted"),
      completed: te("requestStatus_completed"),
      cancelled: te("requestStatus_cancelled"),
      passed: te("examStatus_passed"),
      failed: te("examStatus_failed"),
      in_progress: te("examStatus_in_progress"),
      scheduled: te("examStatus_scheduled"),
      proposed: te("examStatus_proposed"),
      __examDate: te("examDateLabel"),
      __good: te("topicsGood"),
      __repeat: te("topicsRepeat"),
    };
    return map[s] ?? s;
  };

  const grouped = {
    active: (requests ?? []).filter((r) => ["pending", "accepted"].includes(r.status)),
    done: (requests ?? []).filter((r) => ["completed", "cancelled"].includes(r.status)),
  };

  return (
    <div className="max-w-4xl space-y-8">
      <PageHeader
        icon={<ClipboardCheck className="h-5 w-5" />}
        title={t("recentExamResults")}
        breadcrumbs={[
          { href: "/teacher", label: t("overview") },
          { label: t("recentExamResults") },
        ]}
      />

      {(requests ?? []).length === 0 && (
        <p className="text-sm text-muted">Noch keine Prüfungsanfragen gestellt.</p>
      )}

      {grouped.active.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Aktive Anfragen</h2>
          <ExamList rows={grouped.active} statusColor={statusColor} statusLabel={statusLabel} locale={locale} checksBySession={checksBySession} titleById={titleById} />
        </section>
      )}

      {grouped.done.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Abgeschlossene Prüfungen</h2>
          <ExamList rows={grouped.done} statusColor={statusColor} statusLabel={statusLabel} locale={locale} checksBySession={checksBySession} titleById={titleById} />
        </section>
      )}
    </div>
  );
}

type Row = {
  id: string;
  status: string;
  notes: string | null;
  created_at: string;
  student_profiles: { full_name: string } | null;
  groups: { name: string } | null;
  exam_sessions: Array<{ id: string; status: string; exam_date: string; oral_passed: boolean | null; written_passed: boolean | null; summary: string | null }> | null;
};

function ExamList({ rows, statusColor, statusLabel, locale, checksBySession, titleById }: {
  rows: Row[];
  statusColor: (s: string) => string;
  statusLabel: (s: string) => string;
  locale: string;
  checksBySession: Map<string, string[]>;
  titleById: Map<string, string>;
}) {
  return (
    <ul className={listCard}>
      {rows.map((req) => {
        const student = req.student_profiles as { full_name: string } | null;
        const group = req.groups as { name: string } | null;
        const sessions = (req.exam_sessions ?? []) as Row["exam_sessions"];
        const latestSession = sessions && sessions.length > 0 ? sessions[0] : null;
        const displayStatus = latestSession ? latestSession.status : req.status;

        const checkedLessonIds = latestSession
          ? checksBySession.get(latestSession.id) ?? []
          : [];
        const allLessonTitles = [...titleById.values()];
        const tickedTitles = checkedLessonIds.map((id) => titleById.get(id)).filter(Boolean);
        const untickedTitles = allLessonTitles.filter(
          (title) => !checkedLessonIds.some((id) => titleById.get(id) === title),
        );

        return (
          <li key={req.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{student?.full_name ?? "—"}</span>
                  <span className="text-xs text-muted">({group?.name ?? "—"})</span>
                </div>
                {req.notes && (
                  <p className="text-xs text-muted mt-0.5 truncate">{req.notes}</p>
                )}
                {latestSession?.summary && (
                  <p className="text-xs text-muted mt-0.5 truncate italic">{latestSession.summary}</p>
                )}
                <p className="text-xs text-muted mt-1">
                  {formatDate(req.created_at, locale, { year: "numeric", month: "2-digit", day: "2-digit" })}
                  {latestSession?.exam_date && ` · ${statusLabel("__examDate")}: ${formatDateShort(latestSession.exam_date, locale)}`}
                </p>

                {/* Which lessons were good, which need repeating — the point of
                    the tick list for the requesting teacher. */}
                {(latestSession?.status === "passed" || latestSession?.status === "failed") &&
                (tickedTitles.length > 0 || untickedTitles.length > 0) ? (
                  <div className="mt-2 space-y-1">
                    {tickedTitles.length > 0 ? (
                      <div className="text-xs">
                        <span className="font-medium text-success-fg">{statusLabel("__good")}:</span>{" "}
                        <span className="text-muted">{tickedTitles.join(", ")}</span>
                      </div>
                    ) : null}
                    {untickedTitles.length > 0 ? (
                      <div className="text-xs line-clamp-2" title={untickedTitles.join(", ")}>
                        <span className="font-medium text-danger-fg">{statusLabel("__repeat")}:</span>{" "}
                        <span className="text-muted">{untickedTitles.join(", ")}</span>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <span className={`shrink-0 text-xs rounded-full px-2.5 py-0.5 font-medium ${statusColor(displayStatus)}`}>
                {statusLabel(displayStatus)}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
