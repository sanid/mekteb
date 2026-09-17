import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import TestForm from "./TestForm";

type Props = { params: Promise<{ token: string }> };

export default async function PublicTestPage({ params }: Props) {
  const { token } = await params;
  const t = await getTranslations("WrittenTest");
  const admin = createAdminClient();

  const { data: test } = await admin
    .from("written_tests")
    .select(
      "id, title, status, question_ids, mosque_id, student_profile_id, mosques(name), student_profiles(full_name)"
    )
    .eq("token", token)
    .maybeSingle();

  if (!test) notFound();

  const mosqueName = (test.mosques as { name: string } | null)?.name ?? "";
  const studentName = (test.student_profiles as { full_name: string } | null)?.full_name ?? "";

  // Submitted: show confirmation
  if (test.status === "submitted") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md text-center space-y-4">
          <div className="text-4xl">✓</div>
          <h1 className="text-xl font-semibold">{t("submitted")}</h1>
          <p className="text-muted-foreground text-sm">{t("savedAndGraded")}</p>
        </div>
      </div>
    );
  }

  // Graded: show results
  if (test.status === "graded") {
    const { data: answers } = await admin
      .from("written_test_answers")
      .select("question_order, answer_text, examiner_comment, exam_questions(question_text)")
      .eq("written_test_id", test.id)
      .order("question_order");

    const { data: testFull } = await admin
      .from("written_tests")
      .select("overall_result, examiner_note")
      .eq("id", test.id)
      .single();

    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
          <div className="border-b border-card-border pb-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{mosqueName}</p>
            <h1 className="text-2xl font-semibold">{test.title}</h1>
            <p className="text-sm text-muted-foreground mt-2">
              {t("student")} <strong>{studentName}</strong>
            </p>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm font-medium">{t("result")}</span>
              <span className={`text-xs rounded-full px-2.5 py-0.5 font-medium ${
                testFull?.overall_result === "passed"
                  ? "bg-success-subtle text-success-fg"
                  : "bg-danger-subtle text-danger-fg"
              }`}>
                {testFull?.overall_result === "passed" ? t("passed") : t("failed2")}
              </span>
            </div>
            {testFull?.examiner_note && (
              <p className="mt-2 text-sm text-muted-foreground italic">{testFull.examiner_note}</p>
            )}
          </div>

          <div className="space-y-6">
            {(answers ?? []).map((a, i) => {
              const q = a.exam_questions as { question_text: string } | null;
              return (
                <div key={i} className="space-y-2">
                  <p className="font-semibold text-sm">{i + 1}. {q?.question_text}</p>
                  <div className="rounded-lg border border-card-border bg-card px-3 py-2 text-sm text-muted-foreground">
                    {a.answer_text || <em>{t("noAnswerGiven")}</em>}
                  </div>
                  {a.examiner_comment && (
                    <div className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-sm">
                      <span className="text-xs font-medium text-accent uppercase tracking-wide">
                        {t("examiner")}{" "}
                      </span>
                      {a.examiner_comment}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Pending: fetch questions in order and show form
  const questionIds: string[] = test.question_ids as string[];
  const { data: questionsRaw } = await admin
    .from("exam_questions")
    .select("id, question_text")
    .in("id", questionIds);

  const questions = questionIds
    .map((id, i) => {
      const q = (questionsRaw ?? []).find((r) => r.id === id);
      return q ? { id: q.id, question_text: q.question_text, order: i + 1 } : null;
    })
    .filter((q): q is NonNullable<typeof q> => q !== null);

  return (
    <TestForm
      token={token}
      testTitle={test.title}
      mosqueName={mosqueName}
      studentName={studentName}
      questions={questions}
    />
  );
}
