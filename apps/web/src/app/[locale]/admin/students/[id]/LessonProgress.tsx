"use client";

import { useOptimistic, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toggleLessonCompletion } from "./actions";

interface Topic {
  id: string;
  title: string;
}

interface Lesson {
  id: string;
  title: string;
  topic_id: string | null;
  completed: boolean;
}

export function LessonProgress({
  studentId,
  topics,
  lessons,
}: {
  studentId: string;
  topics: Topic[];
  lessons: Lesson[];
}) {
  const t = useTranslations("Admin");
  const [, startTransition] = useTransition();

  // Optimistic state: the entire lessons array lives here.
  // Each toggle flips the local state immediately; the server call runs in
  // the background and the real state re-syncs on the next server render.
  const [optimisticLessons, flipLesson] = useOptimistic(
    lessons,
    (state, lessonId: string) =>
      state.map((l) =>
        l.id === lessonId ? { ...l, completed: !l.completed } : l,
      ),
  );

  function toggle(lessonId: string, currentCompleted: boolean) {
    const fd = new FormData();
    fd.set("lesson_id", lessonId);
    fd.set("completed", String(!currentCompleted));

    startTransition(async () => {
      flipLesson(lessonId); // instant local flip
      await toggleLessonCompletion(studentId, fd);
    });
  }

  const total = optimisticLessons.length;
  const done = optimisticLessons.filter((l) => l.completed).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const byTopic = new Map<string | null, Lesson[]>();
  for (const l of optimisticLessons) {
    const list = byTopic.get(l.topic_id) ?? [];
    list.push(l);
    byTopic.set(l.topic_id, list);
  }

  return (
    <div className="space-y-4">
      {/* Progress summary */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">
          {done} / {total} {t("lessonsCompleted")}
        </span>
        <span className="text-muted">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-card-border overflow-hidden">
        <div
          className="h-full rounded-full bg-accent transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Topics */}
      {topics.map((tp) => {
        const tpLessons = byTopic.get(tp.id) ?? [];
        if (tpLessons.length === 0) return null;
        const tpDone = tpLessons.filter((l) => l.completed).length;
        return (
          <div key={tp.id} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">{tp.title}</span>
              <span className="text-muted">{tpDone}/{tpLessons.length}</span>
            </div>
            <ul className="space-y-0.5">
              {tpLessons.map((l) => (
                <LessonCheckbox
                  key={l.id}
                  lessonId={l.id}
                  title={l.title}
                  completed={l.completed}
                  onToggle={toggle}
                />
              ))}
            </ul>
          </div>
        );
      })}

      {/* Uncategorised */}
      {(() => {
        const uncat = byTopic.get(null) ?? [];
        if (uncat.length === 0) return null;
        const uDone = uncat.filter((l) => l.completed).length;
        return (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">{t("uncategorized")}</span>
              <span className="text-muted">{uDone}/{uncat.length}</span>
            </div>
            <ul className="space-y-0.5">
              {uncat.map((l) => (
                <LessonCheckbox
                  key={l.id}
                  lessonId={l.id}
                  title={l.title}
                  completed={l.completed}
                  onToggle={toggle}
                />
              ))}
            </ul>
          </div>
        );
      })()}
    </div>
  );
}

function LessonCheckbox({
  lessonId,
  title,
  completed,
  onToggle,
}: {
  lessonId: string;
  title: string;
  completed: boolean;
  onToggle: (lessonId: string, currentCompleted: boolean) => void;
}) {
  const t = useTranslations("Admin");

  return (
    <li>
      <button
        type="button"
        onClick={() => onToggle(lessonId, completed)}
        aria-label={completed ? t("markIncomplete") : t("markComplete")}
        className="flex w-full items-center gap-2.5 text-sm py-2 px-1 -mx-1 rounded-lg text-left transition-colors hover:bg-accent-subtle"
      >
        <span
          className={`w-5 h-5 rounded border shrink-0 flex items-center justify-center transition-colors ${
            completed
              ? "bg-accent border-accent text-primary-foreground"
              : "border-card-border bg-background"
          }`}
        >
          {completed && (
            <svg
              viewBox="0 0 12 12"
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M2 6l3 3 5-5" />
            </svg>
          )}
        </span>
        <span className={completed ? "line-through text-muted" : ""}>{title}</span>
      </button>
    </li>
  );
}
