"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";

import { setLessonChecked } from "./actions";
import { cn } from "@/lib/utils";

type Lesson = { id: string; title: string };

/**
 * The lesson checklist behind an oral exam.
 *
 * While the exam runs (`editable`) the examiner ticks lessons off one by one
 * as the student recites them; each toggle persists immediately and the
 * server page revalidates so the result view agrees. Once the result is
 * recorded the list is read-only: ticked lessons are the ones that were
 * good, the rest need to be repeated.
 */
export default function LessonChecklist({
  sessionId,
  lessons,
  checked,
  editable,
}: {
  sessionId: string;
  lessons: Lesson[];
  checked: string[];
  editable: boolean;
}) {
  const t = useTranslations("Examiner");
  const [pending, startTransition] = useTransition();
  const [ticked, setTicked] = useState<Set<string>>(new Set(checked));
  const [error, setError] = useState<string | null>(null);

  const toggle = (lessonId: string) => {
    if (!editable || pending) return;
    const next = ticked.has(lessonId);
    // Optimistic — a failed save flips back below.
    setTicked((prev) => {
      const copy = new Set(prev);
      if (next) copy.delete(lessonId);
      else copy.add(lessonId);
      return copy;
    });
    setError(null);
    startTransition(async () => {
      const res = await setLessonChecked(sessionId, lessonId, !next);
      if (res && "error" in res) {
        setError(res.error);
        setTicked((prev) => {
          const copy = new Set(prev);
          if (next) copy.add(lessonId);
          else copy.delete(lessonId);
          return copy;
        });
      }
    });
  };

  const done = ticked.size;
  const todo = lessons.length - done;

  return (
    <section className="space-y-3 rounded-xl border border-card-border bg-card p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">{t("lessonChecklist")}</h3>
        <span className="text-xs rounded-full bg-surface px-2.5 py-0.5 font-medium text-muted">
          {done}/{lessons.length} {t("checkedOff")}
        </span>
      </div>

      {error ? <p className="text-sm text-danger-fg">{error}</p> : null}

      {lessons.length === 0 ? (
        <p className="text-sm text-muted">{t("noLessonsPublished")}</p>
      ) : (
        <ul className="divide-y divide-card-border">
          {lessons.map((lesson) => {
            const on = ticked.has(lesson.id);
            return (
              <li key={lesson.id}>
                <button
                  type="button"
                  disabled={!editable || pending}
                  onClick={() => toggle(lesson.id)}
                  className={cn(
                    "flex w-full items-center gap-3 py-2.5 text-left text-sm",
                    !editable && "cursor-default",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                      on
                        ? "border-success bg-success text-white"
                        : "border-card-border bg-background",
                    )}
                  >
                    {on ? <Check className="h-3.5 w-3.5" /> : null}
                  </span>
                  <span
                    className={cn(
                      "flex-1",
                      on ? "font-medium" : "text-muted",
                    )}
                  >
                    {lesson.title}
                  </span>
                  {!on && !editable ? (
                    <span className="shrink-0 text-xs rounded-full bg-danger-subtle px-2 py-0.5 font-medium text-danger-fg">
                      {t("toRepeat")}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {editable && todo > 0 ? (
        <p className="text-xs text-muted">{t("lessonChecklistHint")}</p>
      ) : null}
    </section>
  );
}
