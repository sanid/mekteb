import { notFound } from "next/navigation";
import { requireExaminer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ClipboardCheck } from "lucide-react";
import GradeForm from "./GradeForm";

type Props = { params: Promise<{ id: string }> };

export default async function GradeWrittenTestPage({ params }: Props) {
  const { id: testId } = await params;
  const ctx = await requireExaminer();
  const supabase = await createClient();

  const { data: test } = await supabase
    .from("written_tests")
    .select("id, title, status, overall_result, examiner_note, student_profiles(full_name), exam_sessions(id)")
    .eq("id", testId)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();

  if (!test) notFound();

  const studentName = (test.student_profiles as { full_name: string } | null)?.full_name ?? "—";
  const examSessionId = (test.exam_sessions as { id: string } | null)?.id;

  const { data: answersRaw } = await supabase
    .from("written_test_answers")
    .select("id, question_order, answer_text, examiner_comment, exam_questions(question_text)")
    .eq("written_test_id", testId)
    .order("question_order");

  const answers = (answersRaw ?? []).map((a) => ({
    id: a.id,
    question_order: a.question_order,
    question_text: (a.exam_questions as { question_text: string } | null)?.question_text ?? "—",
    answer_text: a.answer_text,
    examiner_comment: a.examiner_comment,
  }));

  const isGraded = test.status === "graded";

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        icon={<ClipboardCheck className="h-5 w-5" />}
        title={test.title}
        breadcrumbs={[
          { href: "/examiner", label: "Übersicht" },
          ...(examSessionId ? [{ href: `/examiner/exams/${examSessionId}`, label: "Prüfung" }] : []),
          { label: "Schriftlicher Test" },
        ]}
      />

      <div className="rounded-xl border border-card-border bg-card p-4 text-sm flex items-center justify-between">
        <span className="text-muted-foreground">Schüler: <strong className="text-foreground">{studentName}</strong></span>
        <span className={`text-xs rounded-full px-2.5 py-0.5 font-medium ${
          test.status === "submitted" ? "bg-warning-subtle text-warning-fg"
          : test.status === "graded" ? (
            test.overall_result === "passed"
              ? "bg-success-subtle text-success-fg"
              : "bg-danger-subtle text-danger-fg"
          ) : "bg-card-border text-muted-foreground"
        }`}>
          {test.status === "pending" ? "Ausstehend"
            : test.status === "submitted" ? "Eingereicht"
            : test.overall_result === "passed" ? "Bestanden"
            : "Nicht bestanden"}
        </span>
      </div>

      {isGraded ? (
        // Read-only graded view
        <div className="space-y-4">
          {test.examiner_note && (
            <div className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm">
              <span className="text-xs font-medium text-accent uppercase tracking-wide block mb-1">Gesamtnotiz</span>
              {test.examiner_note}
            </div>
          )}
          {answers.map((a, i) => (
            <div key={a.id} className="rounded-xl border border-card-border bg-card p-5 space-y-2">
              <p className="font-semibold text-sm">{i + 1}. {a.question_text}</p>
              <div className="rounded-lg border border-card-border bg-background px-3.5 py-2.5 text-sm text-muted-foreground">
                {a.answer_text || <em>Keine Antwort</em>}
              </div>
              {a.examiner_comment && (
                <div className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-sm">
                  <span className="text-xs font-medium text-accent">Kommentar: </span>
                  {a.examiner_comment}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : test.status === "submitted" ? (
        <GradeForm testId={testId} answers={answers} />
      ) : (
        <div className="rounded-xl border border-card-border bg-card p-6 text-center text-sm text-muted-foreground">
          Warte auf den Schüler — noch nicht eingereicht.
        </div>
      )}
    </div>
  );
}
