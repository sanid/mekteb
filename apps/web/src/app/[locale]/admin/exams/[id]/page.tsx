import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ClipboardCheck } from "lucide-react";

import { Link } from "@/i18n/routing";
import { requireAdmin } from "@/lib/auth";
import { requirePlugin } from "@/lib/plugins";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import DiplomaPicker from "@/components/DiplomaPicker";
import { buttonVariants } from "@/components/ui/button";

import { formatDateShort } from "@/lib/format";
type Props = { params: Promise<{ id: string }> };

export default async function AdminExamDetailPage({ params }: Props) {
  const { id: sessionId } = await params;
  const ctx = await requireAdmin();
  await requirePlugin(ctx.mosqueId, "exam_system", "/admin");
  const locale = await getLocale();
  const t = await getTranslations("Examiner");
  const ta = await getTranslations("Admin");
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("exam_sessions")
    .select(
      "id, status, summary, exam_date, diploma_generated_at, oral_required, written_required, oral_passed, written_passed, student_profile_id, student_profiles(full_name), groups!exam_sessions_from_group_id_fkey(name), teacher_profiles!exam_sessions_examiner_profile_id_fkey(profiles(full_name)), exam_requests(notes, requested_by, teacher_profiles(profiles(full_name)))"
    )
    .eq("id", sessionId)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();

  if (!session) notFound();

  const student = session.student_profiles as { full_name: string } | null;
  const group = session.groups as { name: string } | null;
  const examiner = session.teacher_profiles as { profiles: { full_name: string } | null } | null;
  const examinerName = (examiner?.profiles as { full_name: string } | null)?.full_name ?? "—";
  const request = session.exam_requests as {
    notes: string | null;
    teacher_profiles: { profiles: { full_name: string } | null } | null;
  } | null;
  const requestingTeacher = (request?.teacher_profiles?.profiles as { full_name: string } | null)?.full_name ?? "—";

  // Written test if any
  const { data: writtenTest } = await supabase
    .from("written_tests")
    .select("id, title, status, overall_result, examiner_note, submitted_at, graded_at")
    .eq("exam_session_id", sessionId)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();

  const { data: writtenAnswers } = writtenTest
    ? await supabase
        .from("written_test_answers")
        .select("id, question_order, answer_text, examiner_comment, exam_questions(question_text)")
        .eq("written_test_id", writtenTest.id)
        .order("question_order")
    : { data: null };

  const statusColor = (s: string) => {
    switch (s) {
      case "passed": return "bg-success-subtle text-success-fg";
      case "failed": return "bg-danger-subtle text-danger-fg";
      case "in_progress": return "bg-info-subtle text-info-fg";
      case "scheduled": return "bg-accent-subtle text-accent";
      case "cancelled": return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
      default: return "bg-card-border text-muted-foreground";
    }
  };

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      passed: t("passed"), failed: t("failed"), in_progress: t("examStatus_in_progress"),
      scheduled: t("examStatus_scheduled"), cancelled: t("requestStatus_cancelled"),
    };
    return map[s] ?? s;
  };

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        icon={<ClipboardCheck className="h-5 w-5" />}
        title={student?.full_name ?? "Prüfung"}
        breadcrumbs={[
          { href: "/admin", label: ta("overview") },
          { href: "/admin/exams", label: ta("exams") },
          { label: student?.full_name ?? "—" },
        ]}
      />

      {/* Info card */}
      <section className="rounded-xl border border-card-border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{t("examDetail")}</h2>
          <span className={`text-xs rounded-full px-2.5 py-0.5 font-medium ${statusColor(session.status)}`}>
            {statusLabel(session.status)}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">{t("student")}</div>
            <div className="font-medium">{student?.full_name ?? "—"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">{t("group")}</div>
            <div className="font-medium">{group?.name ?? "—"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">{t("date")}</div>
            <div className="font-medium">{formatDateShort(session.exam_date, locale)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Prüfer</div>
            <div className="font-medium">{examinerName}</div>
          </div>
          <div>
            <div className="text-muted-foreground">{t("requestedBy")}</div>
            <div className="font-medium">{requestingTeacher}</div>
          </div>
          {request?.notes && (
            <div>
              <div className="text-muted-foreground">{t("notes")}</div>
              <div className="font-medium">{request.notes}</div>
            </div>
          )}
        </div>

        {/* Parts */}
        <div className="flex gap-4 pt-1 text-sm">
          {session.oral_required && (
            <div className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${session.oral_passed ? "bg-success" : "bg-gray-300"}`} />
              <span>{t("oralPart")}: {session.oral_passed ? t("passed") : session.oral_passed === false ? t("failed") : "–"}</span>
            </div>
          )}
          {session.written_required && (
            <div className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${session.written_passed ? "bg-success" : "bg-gray-300"}`} />
              <span>{t("writtenPart")}: {session.written_passed ? t("passed") : session.written_passed === false ? t("failed") : "–"}</span>
            </div>
          )}
        </div>

        {session.summary && (
          <div className="rounded-lg border border-card-border bg-background px-3.5 py-2.5 text-sm text-muted-foreground">
            {session.summary}
          </div>
        )}

        {session.status === "passed" && (
          <div className="pt-1">
            <DiplomaPicker sessionId={sessionId} label={t("generateDiploma")} basePath="/admin/exams" />
          </div>
        )}
      </section>

      {/* Written test */}
      {writtenTest && (
        <section className="rounded-xl border border-card-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Schriftlicher Online-Test</h2>
            <span className={`text-xs rounded-full px-2.5 py-0.5 font-medium ${
              writtenTest.status === "graded"
                ? writtenTest.overall_result === "passed"
                  ? "bg-success-subtle text-success-fg"
                  : "bg-danger-subtle text-danger-fg"
                : writtenTest.status === "submitted"
                ? "bg-warning-subtle text-warning-fg"
                : "bg-card-border text-muted-foreground"
            }`}>
              {writtenTest.status === "pending" ? "Ausstehend"
                : writtenTest.status === "submitted" ? "Eingereicht"
                : writtenTest.overall_result === "passed" ? "Bestanden"
                : "Nicht bestanden"}
            </span>
          </div>

          <p className="text-sm font-medium">{writtenTest.title}</p>

          {writtenTest.examiner_note && (
            <div className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-sm">
              <span className="text-xs font-medium text-accent block mb-1">Prüfernotiz</span>
              {writtenTest.examiner_note}
            </div>
          )}

          {(writtenAnswers ?? []).length > 0 && (
            <div className="space-y-3">
              {(writtenAnswers ?? []).map((a, i) => {
                const q = a.exam_questions as { question_text: string } | null;
                return (
                  <div key={a.id} className="space-y-1.5">
                    <p className="text-sm font-medium">{i + 1}. {q?.question_text}</p>
                    <div className="rounded-lg border border-card-border bg-background px-3.5 py-2.5 text-sm text-muted-foreground">
                      {a.answer_text || <em>Keine Antwort</em>}
                    </div>
                    {a.examiner_comment && (
                      <div className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-xs">
                        <span className="font-medium text-accent">Kommentar: </span>
                        {a.examiner_comment}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {writtenTest.status === "submitted" && (
            <Link
              href={`/examiner/written-tests/${writtenTest.id}`}
              className={buttonVariants({ size: "sm" })}
            >
              Test bewerten
            </Link>
          )}
        </section>
      )}
    </div>
  );
}
