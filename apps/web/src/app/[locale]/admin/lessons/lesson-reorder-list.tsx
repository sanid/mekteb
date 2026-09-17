"use client";

import { useOptimistic, useTransition } from "react";
import { Link } from "@/i18n/routing";
import { extractPlainText } from "@/lib/blocknote-utils";
import { reorderLessons } from "./actions";
import { listCard } from "@/components/ui/surfaces";

interface Lesson {
  id: string;
  title: string;
  body: unknown;
  sort_order: number;
}

export function LessonReorderList({ lessons }: { lessons: Lesson[] }) {
  const [isPending, startTransition] = useTransition();

  const [optimisticLessons, addOptimisticLesson] = useOptimistic(
    lessons,
    (state, next: Lesson[]) => next
  );

  function moveUp(index: number) {
    if (index === 0) return;
    const next = [...optimisticLessons];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];

    startTransition(async () => {
      addOptimisticLesson(next);
      await reorderLessons(next.map((l) => l.id));
    });
  }

  function moveDown(index: number) {
    if (index === optimisticLessons.length - 1) return;
    const next = [...optimisticLessons];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];

    startTransition(async () => {
      addOptimisticLesson(next);
      await reorderLessons(next.map((l) => l.id));
    });
  }

  if (optimisticLessons.length === 0) return null;

  return (
    <ul className={listCard}>
      {optimisticLessons.map((l, i) => {
        const preview = extractPlainText(l.body);
        return (
          <li key={l.id} className="flex items-stretch">
            <div className="flex flex-col justify-center shrink-0 border-r border-card-border">
              <button
                type="button"
                disabled={i === 0 || isPending}
                onClick={() => moveUp(i)}
                className="px-2 py-1 text-xs text-muted hover:text-foreground disabled:opacity-30 transition-colors"
                aria-label="Move up"
              >
                &#9650;
              </button>
              <button
                type="button"
                disabled={i === optimisticLessons.length - 1 || isPending}
                onClick={() => moveDown(i)}
                className="px-2 py-1 text-xs text-muted hover:text-foreground disabled:opacity-30 transition-colors border-t border-card-border"
                aria-label="Move down"
              >
                &#9660;
              </button>
            </div>
            <Link
              href={`/admin/lessons/${l.id}`}
              className="flex-1 p-4 space-y-1 transition-colors hover:bg-accent-subtle"
            >
              <div className="font-medium">{l.title}</div>
              {preview ? (
                <div className="text-sm text-muted line-clamp-2">{preview}</div>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
