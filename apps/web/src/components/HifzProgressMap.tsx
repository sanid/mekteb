import { BookHeart } from "lucide-react";

const TOTAL_PAGES = 604;

// Conventional juz start pages in the 604-page Madani mushaf. Index i holds the
// first page of juz (i + 1); the array is used to size each juz cell so a
// partially-memorised juz fills proportionally.
const JUZ_START_PAGES = [
  1, 22, 42, 62, 82, 102, 121, 142, 162, 182, 201, 222, 242, 262, 282, 302,
  322, 342, 362, 382, 402, 422, 442, 462, 482, 502, 522, 542, 562, 582,
];

export type HifzMapLabels = {
  /** e.g. "Hifz Progress" */
  title: string;
  /** e.g. "pages" */
  pages: string;
  /** e.g. "Juz" */
  juz: string;
  /** e.g. "memorised" */
  memorized: string;
  /** e.g. "Complete" — shown when all 604 pages are done */
  complete: string;
};

/**
 * Read-only visualisation of a student's Hifz memorisation as a 30-cell juz
 * map. `pagesMemorized` is interpreted the same way as the rest of the app:
 * a cumulative count of pages from the start of the mushaf.
 */
export function HifzProgressMap({
  pagesMemorized,
  groupName,
  notes,
  labels,
}: {
  pagesMemorized: number;
  groupName?: string | null;
  notes?: string | null;
  labels: HifzMapLabels;
}) {
  const pages = Math.min(TOTAL_PAGES, Math.max(0, pagesMemorized));
  const pct = Math.round((pages / TOTAL_PAGES) * 100);
  const fullJuz = JUZ_START_PAGES.filter((start) => pages >= start).length;
  const isComplete = pages >= TOTAL_PAGES;

  return (
    <div className="rounded-xl border border-card-border overflow-hidden">
      <div className="px-4 py-3 border-b border-card-border bg-card flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <BookHeart className="h-4 w-4 shrink-0 text-accent" />
          <h3 className="text-sm font-semibold truncate">
            {labels.title}
            {groupName ? <span className="text-muted font-normal"> · {groupName}</span> : null}
          </h3>
        </div>
        <span className="shrink-0 rounded-full bg-success-subtle text-success-fg px-2.5 py-0.5 font-semibold text-xs font-semibold tabular-nums">
          {isComplete ? labels.complete : `${fullJuz} ${labels.juz}`}
        </span>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-baseline justify-between text-xs text-muted">
          <span className="tabular-nums">
            {pages} / {TOTAL_PAGES} {labels.pages} {labels.memorized}
          </span>
          <span className="tabular-nums font-medium text-foreground">{pct}%</span>
        </div>

        {/* 30-juz grid: each cell fills proportionally to pages memorised in it */}
        <div className="grid grid-cols-10 gap-1" role="img" aria-label={`${fullJuz} / 30 ${labels.juz}`}>
          {JUZ_START_PAGES.map((start, i) => {
            const end = i < 29 ? JUZ_START_PAGES[i + 1] - 1 : TOTAL_PAGES;
            const span = end - start + 1;
            const done = Math.min(span, Math.max(0, pages - (start - 1)));
            const fill = Math.round((done / span) * 100);
            return (
              <div
                key={i}
                title={`${labels.juz} ${i + 1}`}
                className="relative h-7 rounded-md bg-card-border/60 overflow-hidden flex items-center justify-center"
              >
                <div
                  className="absolute inset-y-0 left-0 bg-success transition-all"
                  style={{ width: `${fill}%` }}
                />
                <span className="relative text-[11px] font-medium tabular-nums text-foreground/70">
                  {i + 1}
                </span>
              </div>
            );
          })}
        </div>

        {notes ? <p className="text-xs text-muted whitespace-pre-wrap pt-1">{notes}</p> : null}
      </div>
    </div>
  );
}
