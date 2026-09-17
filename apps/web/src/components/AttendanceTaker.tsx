"use client";

import { useOptimistic, useState, useTransition, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Check, X, Clock, Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { listCard } from "@/components/ui/surfaces";

export type AttendanceStatus = "present" | "absent" | "late" | "excused";

type Result = { ok: true } | { error: string };

type Props = {
  date: string;
  students: { id: string; name: string }[];
  initialStatuses: Record<string, AttendanceStatus>;
  labels: {
    sessionDate: string;
    present: string;
    absent: string;
    late: string;
    excused: string;
    notSet: string;
    saveError: string;
    enrollFirst: string;
  };
  setAction: (input: {
    date: string;
    studentId: string;
    status: AttendanceStatus;
  }) => Promise<Result>;
};

const STATUS_META: Record<
  AttendanceStatus,
  { icon: typeof Check; classes: string; activeClasses: string }
> = {
  present: {
    icon: Check,
    classes:
      "text-muted hover:bg-card hover:text-success-fg",
    activeClasses:
      "bg-success text-white dark:text-background shadow-elevated",
  },
  absent: {
    icon: X,
    classes:
      "text-muted hover:bg-card hover:text-danger-fg",
    activeClasses:
      "bg-danger text-white dark:text-background shadow-elevated",
  },
  late: {
    icon: Clock,
    classes:
      "text-muted hover:bg-card hover:text-warning-fg",
    activeClasses:
      "bg-warning text-white dark:text-background shadow-elevated",
  },
  excused: {
    icon: Shield,
    classes:
      "text-muted hover:bg-card hover:text-info-fg",
    activeClasses:
      "bg-info text-white dark:text-background shadow-elevated",
  },
};

const STATUS_ORDER: AttendanceStatus[] = ["present", "absent", "late", "excused"];

export function AttendanceTaker({
  date,
  students,
  initialStatuses,
  labels,
  setAction,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [actual, setActual] = useState<Record<string, AttendanceStatus>>(initialStatuses);
  const [optimistic, setOptimistic] = useOptimistic(
    actual,
    (state, update: { id: string; status: AttendanceStatus }) => ({
      ...state,
      [update.id]: update.status,
    }),
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const lastDateRef = useRef(date);

  function changeDate(next: string) {
    if (!next || next === date) return;
    lastDateRef.current = next;
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("date", next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function setStatus(studentId: string, status: AttendanceStatus) {
    setSavingId(studentId);
    startTransition(async () => {
      setOptimistic({ id: studentId, status });
      const result = await setAction({ date, studentId, status });
      if ("error" in result) {
        toast.error(`${labels.saveError}: ${result.error}`);
      } else {
        setActual((prev) => ({ ...prev, [studentId]: status }));
      }
      setSavingId(null);
    });
  }

  const labelFor: Record<AttendanceStatus, string> = {
    present: labels.present,
    absent: labels.absent,
    late: labels.late,
    excused: labels.excused,
  };

  return (
    <div className="space-y-4 rounded-xl border border-card-border bg-card p-3 sm:p-4">
      <div className="flex items-center gap-3">
        <label className="flex w-full items-center justify-between gap-2 text-sm font-medium sm:w-auto sm:justify-start">
          <span>{labels.sessionDate}</span>
          <Input
            type="date"
            defaultValue={date}
            onChange={(e) => changeDate(e.target.value)}
            className="w-auto"
          />
        </label>
      </div>

      {students.length === 0 ? (
        <p className="text-sm text-muted">{labels.enrollFirst}</p>
      ) : (
        <ul className={listCard}>
          {students.map((s) => {
            const current = optimistic[s.id];
            const saving = savingId === s.id;
            return (
              <li
                key={s.id}
                className="flex flex-col gap-2.5 bg-card px-3 py-3 sm:min-h-14 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4 sm:py-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-[11px] font-semibold text-accent">
                    {s.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                  </span>
                  <span className="min-w-0 truncate text-sm font-medium">{s.name}</span>
                  {saving && (
                    <Loader2
                      className="h-3 w-3 animate-spin text-muted"
                      aria-hidden="true"
                    />
                  )}
                  {!current && !saving && (
                    <span className="shrink-0 whitespace-nowrap text-xs text-muted">{labels.notSet}</span>
                  )}
                </div>
                <div
                  className="grid grid-cols-4 gap-0.5 rounded-lg bg-surface p-[3px] sm:flex sm:shrink-0"
                  role="radiogroup"
                  aria-label={s.name}
                >
                  {STATUS_ORDER.map((status) => {
                    const meta = STATUS_META[status];
                    const Icon = meta.icon;
                    const active = current === status;
                    return (
                      <button
                        key={status}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        title={labelFor[status]}
                        onClick={() => setStatus(s.id, status)}
                        disabled={saving}
                        className={cn(
                          "inline-flex h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-md px-1 text-[0.6875rem] font-medium transition-all disabled:opacity-50 sm:h-8 sm:min-w-8 sm:flex-row sm:gap-1.5 sm:px-2.5 sm:text-[0.8125rem]",
                          active ? meta.activeClasses : meta.classes,
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span className="max-w-full truncate capitalize sm:sr-only lg:not-sr-only">{labelFor[status]}</span>
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
