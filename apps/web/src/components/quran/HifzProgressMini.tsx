"use client";

const TOTAL_PAGES = 604;
const JUZ_START_PAGES = [
  1, 22, 42, 62, 82, 102, 121, 142, 162, 182, 201, 222, 242, 262, 282, 302,
  322, 342, 362, 382, 402, 422, 442, 462, 482, 502, 522, 542, 562, 582,
];

export function HifzProgressMini({
  pagesMemorized,
  labels,
}: {
  pagesMemorized: number;
  labels: {
    title: string;
    pages: string;
    juz: string;
    memorized: string;
    complete: string;
  };
}) {
  const pages = Math.min(TOTAL_PAGES, Math.max(0, pagesMemorized));
  const pct = Math.round((pages / TOTAL_PAGES) * 100);
  const fullJuz = JUZ_START_PAGES.filter((start) => pages >= start).length;
  const isComplete = pages >= TOTAL_PAGES;

  return (
    <div className="rounded-xl border border-card-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{labels.title}</h3>
        <span className="shrink-0 rounded-full bg-success-subtle text-success-fg px-2.5 py-0.5 font-semibold text-xs font-semibold">
          {isComplete ? labels.complete : `${fullJuz} ${labels.juz}`}
        </span>
      </div>

      <div className="flex items-baseline justify-between text-xs text-muted">
        <span className="tabular-nums">
          {pages} / {TOTAL_PAGES} {labels.pages} {labels.memorized}
        </span>
        <span className="tabular-nums font-medium text-foreground">{pct}%</span>
      </div>

      <div className="h-2 rounded-full bg-card-border/60 overflow-hidden">
        <div
          className="h-full rounded-full bg-success transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Mini 30-juz grid */}
      <div className="grid grid-cols-10 gap-1">
        {JUZ_START_PAGES.map((start, i) => {
          const end = i < 29 ? JUZ_START_PAGES[i + 1] - 1 : TOTAL_PAGES;
          const span = end - start + 1;
          const done = Math.min(span, Math.max(0, pages - (start - 1)));
          const isFull = done >= span;
          const isPartial = done > 0 && !isFull;
          return (
            <div
              key={i}
              title={`${labels.juz} ${i + 1}`}
              className={`relative h-5 rounded-md flex items-center justify-center text-[11px] font-medium ${
                isFull
                  ? "bg-success text-white"
                  : isPartial
                    ? "bg-success-subtle text-success-fg"
                    : "bg-surface text-muted"
              }`}
            >
              {i + 1}
            </div>
          );
        })}
      </div>
    </div>
  );
}
