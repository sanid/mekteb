"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { submitWrittenTest } from "./actions";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Question = { id: string; question_text: string; order: number };

type Props = {
  token: string;
  testTitle: string;
  mosqueName: string;
  studentName: string;
  questions: Question[];
};

export default function TestForm({ token, testTitle, mosqueName, studentName, questions }: Props) {
  const t = useTranslations("WrittenTest");
  const [answers, setAnswers] = useState<Record<string, string>>(
    Object.fromEntries(questions.map((q) => [q.id, ""]))
  );
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await submitWrittenTest({
          token,
          answers: questions.map((q) => ({
            question_id: q.id,
            question_order: q.order,
            answer_text: answers[q.id] ?? "",
          })),
        });
        setSubmitted(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("submitError"));
      }
    });
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md text-center space-y-4">
          <div className="text-4xl">✓</div>
          <h1 className="text-xl font-semibold">{t("submitted")}</h1>
          <p className="text-muted-foreground text-sm">{t("savedExaminerWillGrade")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="border-b border-card-border pb-6">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{mosqueName}</p>
          <h1 className="text-2xl font-semibold">{testTitle}</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {t("student")} <strong>{studentName}</strong>
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {t("questionsHint", { count: questions.length })}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {questions.map((q, i) => (
            <div key={q.id} className="space-y-2">
              <p className="font-semibold text-sm">
                {i + 1}. {q.question_text}
              </p>
              <textarea
                rows={4}
                value={answers[q.id] ?? ""}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                placeholder={t("yourAnswer")}
                className="w-full rounded-lg border border-card-border bg-card px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>
          ))}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className={cn(buttonVariants({ size: "xl" }), "w-full")}
          >
            {isPending ? t("submitting") : t("submitTest")}
          </button>
        </form>
      </div>
    </div>
  );
}
