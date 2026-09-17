"use client";

import { useState } from "react";

import { inputCls } from "@/components/FormField";
import { buttonVariants } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
type Student = { studentId: string; name: string; hasPending: boolean };

export function BulkExamForm({
  students,
  action,
  label,
  notesLabel,
  submitLabel,
}: {
  students: Student[];
  action: (formData: FormData) => Promise<{ error?: string; ok?: boolean }>;
  label: string;
  notesLabel: string;
  submitLabel: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const eligible = students.filter((s) => !s.hasPending);
  if (eligible.length === 0) return null;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === eligible.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(eligible.map((s) => s.studentId)));
    }
  };

  return (
    <details className="group/bulk rounded-xl border border-card-border bg-card">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium transition-colors hover:bg-surface/50 [&::-webkit-details-marker]:hidden">
        {label}
        <ChevronDown className="h-4 w-4 text-muted transition-transform group-open/bulk:rotate-180" />
      </summary>
      <div className="border-t border-card-border p-4">
        <form
          action={async (fd) => {
            await action(fd);
            setSelected(new Set());
          }}
          className="space-y-3"
        >
          <input
            type="hidden"
            name="student_profile_ids"
            value={[...selected].join(",")}
          />
          <div className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              checked={selected.size === eligible.length && eligible.length > 0}
              onChange={toggleAll}
              className="rounded border-card-border"
            />
            <span className="text-xs text-muted">
              {selected.size}/{eligible.length}
            </span>
          </div>
          <ul className="space-y-1 max-h-40 overflow-y-auto">
            {eligible.map((s) => (
              <li key={s.studentId} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selected.has(s.studentId)}
                  onChange={() => toggle(s.studentId)}
                  className="rounded border-card-border"
                />
                <span className="text-sm">{s.name}</span>
              </li>
            ))}
          </ul>
          <textarea
            name="notes"
            rows={2}
            placeholder={notesLabel}
            className={inputCls}
          />
          <button
            type="submit"
            disabled={selected.size === 0}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {submitLabel} ({selected.size})
          </button>
        </form>
      </div>
    </details>
  );
}
