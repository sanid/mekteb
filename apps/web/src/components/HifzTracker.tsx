"use client";

import { useState, useTransition } from "react";
import { BookHeart } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { inputCls } from "@/components/FormField";
import { buttonVariants } from "@/components/ui/button";
const TOTAL_PAGES = 604;
const PAGES_PER_JUZ = TOTAL_PAGES / 30;

function pagestoJuz(pages: number): string {
  const juz = Math.floor(pages / PAGES_PER_JUZ);
  const remainder = pages - juz * PAGES_PER_JUZ;
  const fraction = remainder / PAGES_PER_JUZ;
  if (juz === 30) return "30";
  if (fraction >= 0.75) return `${juz}¾`;
  if (fraction >= 0.5) return `${juz}½`;
  if (fraction >= 0.25) return `${juz}¼`;
  return `${juz}`;
}

type Student = {
  id: string;
  name: string;
  pagesMemorized: number;
  notes: string | null;
};

type Props = {
  groupId: string;
  students: Student[];
  upsertAction: (
    groupId: string,
    studentId: string,
    pages: number,
    notes?: string,
  ) => Promise<{ error: string } | { ok: true }>;
  labels: {
    title: string;
    pages: string;
    juz: string;
    progress: string;
    save: string;
    notes: string;
    noStudents: string;
    outOf: string;
  };
};

export function HifzTracker({ groupId, students, upsertAction, labels }: Props) {
  const [, startTransition] = useTransition();
  // Local edit state: studentId → { pages, notes }
  const [edits, setEdits] = useState<Record<string, { pages: string; notes: string }>>(() =>
    Object.fromEntries(
      students.map((s) => [s.id, { pages: String(s.pagesMemorized), notes: s.notes ?? "" }]),
    ),
  );

  function handleSave(student: Student) {
    const raw = edits[student.id];
    const pages = Math.min(604, Math.max(0, parseInt(raw.pages, 10) || 0));
    const notes = raw.notes.trim() || undefined;
    startTransition(async () => {
      const res = await upsertAction(groupId, student.id, pages, notes);
      if ("error" in res) {
        toast.error(res.error);
      } else {
        toast.success(`${student.name} — ${pages} / ${TOTAL_PAGES}`);
      }
    });
  }

  if (students.length === 0) {
    return <p className="text-sm text-muted">{labels.noStudents}</p>;
  }

  return (
    <div className="rounded-xl border border-card-border overflow-hidden">
      <div className="px-4 py-3 border-b border-card-border bg-card flex items-center gap-2">
        <BookHeart className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold">{labels.title}</h3>
      </div>
      <ul className="divide-y divide-card-border">
        {students.map((student) => {
          const edit = edits[student.id] ?? { pages: "0", notes: "" };
          const displayPages = Math.min(604, Math.max(0, parseInt(edit.pages, 10) || 0));
          const pct = Math.round((displayPages / TOTAL_PAGES) * 100);
          const juzLabel = pagestoJuz(displayPages);

          return (
            <li key={student.id} className="px-4 py-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-sm">{student.name}</span>
                <div className="flex items-center gap-3 text-xs text-muted">
                  <span className="tabular-nums">
                    {displayPages} / {TOTAL_PAGES} {labels.pages}
                  </span>
                  <span className="rounded-full bg-success-subtle text-success-fg px-2.5 py-0.5 font-semibold">
                    {juzLabel} {labels.juz}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 rounded-full bg-card-border/60 overflow-hidden">
                <div
                  className="h-full rounded-full bg-success transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Edit row */}
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={0}
                    max={604}
                    value={edit.pages}
                    onChange={(e) =>
                      setEdits((prev) => ({
                        ...prev,
                        [student.id]: { ...prev[student.id], pages: e.target.value },
                      }))
                    }
                    className={cn(inputCls, "h-8 w-20 py-1.5 tabular-nums")}
                  />
                  <span className="text-xs text-muted">{labels.outOf} {TOTAL_PAGES}</span>
                </div>
                <input
                  type="text"
                  placeholder={labels.notes}
                  value={edit.notes}
                  onChange={(e) =>
                    setEdits((prev) => ({
                      ...prev,
                      [student.id]: { ...prev[student.id], notes: e.target.value },
                    }))
                  }
                  className={cn(inputCls, "h-8 w-auto min-w-40 flex-1 py-1.5")}
                />
                <button
                  type="button"
                  onClick={() => handleSave(student)}
                  className={cn(buttonVariants({ size: "sm" }), "shrink-0")}
                >
                  {labels.save}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
