"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { gradeWrittenTest } from "./actions";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Answer = {
  id: string;
  question_order: number;
  question_text: string;
  answer_text: string | null;
};

type Props = {
  testId: string;
  answers: Answer[];
};

export default function GradeForm({ testId, answers }: Props) {
  const t = useTranslations("ExamGrading");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Record<string, string>>(
    Object.fromEntries(answers.map((a) => [a.id, ""]))
  );
  const [result, setResult] = useState<"passed" | "failed">("passed");
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await gradeWrittenTest(testId, {
          overall_result: result,
          examiner_note: note,
          answer_comments: answers.map((a) => ({
            answer_id: a.id,
            comment: comments[a.id] ?? "",
          })),
        });
        setDone(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("genericError"));
      }
    });
  }

  if (done) {
    return (
      <div className="rounded-xl border border-card-border bg-card p-6 text-center space-y-2">
        <p className="font-semibold">Bewertung gespeichert</p>
        <p className="text-sm text-muted-foreground">
          Der Schüler wurde benachrichtigt und kann die Ergebnisse einsehen.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <p className="text-xs text-muted-foreground">
        {checked.size} / {answers.length} geprüft
      </p>

      {answers.map((a, i) => {
        const isChecked = checked.has(a.id);
        return (
          <div
            key={a.id}
            className={`rounded-xl border bg-card p-5 space-y-3 transition-colors ${
              isChecked ? "border-success/50" : "border-card-border"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold text-sm">{i + 1}. {a.question_text}</p>
              <button
                type="button"
                onClick={() =>
                  setChecked((prev) => {
                    const next = new Set(prev);
                    next.has(a.id) ? next.delete(a.id) : next.add(a.id);
                    return next;
                  })
                }
                title={isChecked ? t("markUnchecked") : t("markChecked")}
                className={`shrink-0 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                  isChecked
                    ? "border-success bg-success text-white"
                    : "border-card-border hover:border-success"
                }`}
              >
                {isChecked && (
                  <svg viewBox="0 0 10 8" className="h-3 w-3 fill-none stroke-current stroke-2">
                    <polyline points="1,4 4,7 9,1" />
                  </svg>
                )}
              </button>
            </div>
            <div className="rounded-lg border border-card-border bg-background px-3.5 py-2.5 text-sm text-muted-foreground min-h-16">
              {a.answer_text || <em>Keine Antwort</em>}
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Kommentar (optional)
              </label>
              <textarea
                rows={2}
                value={comments[a.id] ?? ""}
                onChange={(e) => setComments((prev) => ({ ...prev, [a.id]: e.target.value }))}
                placeholder={t("feedbackPlaceholder")}
                className="w-full rounded-lg border border-card-border bg-background px-3.5 py-2.5 text-sm resize-none"
              />
            </div>
          </div>
        );
      })}

      <div className="rounded-xl border border-card-border bg-card p-5 space-y-4">
        <h3 className="font-semibold text-sm">Gesamtergebnis</h3>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="result"
              value="passed"
              checked={result === "passed"}
              onChange={() => setResult("passed")}
            />
            <span className="text-sm font-medium text-success-fg">Bestanden</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="result"
              value="failed"
              checked={result === "failed"}
              onChange={() => setResult("failed")}
            />
            <span className="text-sm font-medium text-danger-fg">Nicht bestanden</span>
          </label>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Gesamtnotiz (optional)
          </label>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("overallFeedbackPlaceholder")}
            className="w-full rounded-lg border border-card-border bg-background px-3.5 py-2.5 text-sm resize-none"
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className={cn(buttonVariants({ size: "xl" }), "w-full")}
      >
        {isPending ? t("saving") : t("saveGrading")}
      </button>
    </form>
  );
}
