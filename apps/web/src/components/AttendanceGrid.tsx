import { formatDate } from "@/lib/format";

/**
 * Visual attendance grid — renders each session as a coloured square.
 * Pairs nicely with a detail list below; keeps the at-a-glance summary compact.
 */

export type AttendanceDot = {
  id: string;
  status: string; // "present" | "absent" | "late" | "excused"
  date: string;   // ISO date string, e.g. "2026-04-15"
  groupName?: string | null;
  note?: string | null;
};

const DOT_STYLE: Record<string, string> = {
  present: "bg-success",
  absent:  "bg-danger",
  late:    "bg-warning",
  excused: "bg-info",
};

const LEGEND = [
  { status: "present", color: "bg-success",  label: "Present"  },
  { status: "absent",  color: "bg-danger",    label: "Absent"   },
  { status: "late",    color: "bg-warning",  label: "Late"     },
  { status: "excused", color: "bg-info",   label: "Excused"  },
];

export function AttendanceGrid({ dots, locale }: { dots: AttendanceDot[]; locale: string }) {
  if (dots.length === 0) return null;

  // Sort oldest → newest so you read left-to-right chronologically.
  const sorted = [...dots].sort((a, b) => a.date.localeCompare(b.date));

  const total   = sorted.length;
  const present = sorted.filter((d) => d.status === "present" || d.status === "late").length;
  const rate    = Math.round((present / total) * 100);

  // Status breakdown counts
  const counts = sorted.reduce<Record<string, number>>((acc, d) => {
    acc[d.status] = (acc[d.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="rounded-xl border border-card-border bg-card p-4 space-y-4">
      {/* Summary row */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold tracking-tight tabular-nums text-accent">{rate}%</span>
          <span className="text-sm text-muted">{present}/{total} sessions</span>
        </div>
        {/* Mini breakdown chips */}
        <div className="flex flex-wrap gap-2">
          {LEGEND.map(({ status, color, label }) =>
            counts[status] ? (
              <span key={status} className="flex items-center gap-1.5 text-xs text-muted">
                <span className={`h-2.5 w-2.5 rounded-sm shrink-0 ${color}`} />
                {counts[status]} {label}
              </span>
            ) : null,
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-card-border/60 overflow-hidden">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${rate}%` }}
        />
      </div>

      {/* Dot grid — each square = one session */}
      <div className="flex flex-wrap gap-1.5" role="img" aria-label="Attendance history">
        {sorted.map((d) => (
          <span
            key={d.id}
            className={`block h-4 w-4 rounded-[4px] cursor-default opacity-90 hover:opacity-100 hover:scale-110 transition-transform ${
              DOT_STYLE[d.status] ?? "bg-surface"
            }`}
            title={[
              formatDate(d.date, locale, { month: "short", day: "numeric" }),
              d.groupName,
              d.status.charAt(0).toUpperCase() + d.status.slice(1),
              d.note,
            ]
              .filter(Boolean)
              .join(" · ")}
          />
        ))}
      </div>
    </div>
  );
}
