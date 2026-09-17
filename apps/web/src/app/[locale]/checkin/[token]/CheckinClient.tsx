"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, UserCheck } from "lucide-react";
import { toast } from "sonner";

import { markPresent } from "./actions";
import { listCard } from "@/components/ui/surfaces";

import { buttonVariants } from "@/components/ui/button";
type Student = { id: string; name: string; present: boolean };

export function CheckinClient({
  token,
  students,
  labels,
}: {
  token: string;
  students: Student[];
  labels: { present: string; mark: string; marked: string };
}) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<Record<string, boolean>>(
    Object.fromEntries(students.map((s) => [s.id, s.present])),
  );

  function mark(id: string, name: string) {
    startTransition(async () => {
      const res = await markPresent(token, id);
      if ("error" in res) {
        toast.error(res.error);
      } else {
        setState((prev) => ({ ...prev, [id]: true }));
        toast.success(`${name} — ${labels.marked}`);
      }
    });
  }

  return (
    <ul className={listCard}>
      {students.map((s) => {
        const present = state[s.id];
        return (
          <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
            <span className="font-medium">{s.name}</span>
            {present ? (
              <span className="flex items-center gap-1.5 text-sm font-semibold text-success-fg">
                <CheckCircle2 className="h-4 w-4" /> {labels.present}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => mark(s.id, s.name)}
                disabled={pending}
                className={buttonVariants({ size: "lg" })}
              >
                <UserCheck className="h-4 w-4" /> {labels.mark}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
