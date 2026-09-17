import { formatDate, tm } from "./i18n";

/**
 * What the home-screen widgets show.
 *
 * Formatting only — no API client and no native module — so it can be run and
 * checked outside a simulator, which is the only way any of this gets tested
 * before a build exists.
 *
 * A widget **cannot call the API or run this app's JavaScript** (AGENTS.md §8).
 * It reads a payload out of shared native storage, which means the app has to
 * write one whenever it has fresh data, and the payload has to be
 * *pre-formatted*: the widget has no message catalogue and no date formatter,
 * so every string here is already in the reader's language.
 *
 * It also refreshes on the OS's schedule, not ours, so the payload carries the
 * time it was written and the widget says so rather than implying the numbers
 * are live.
 */
export type WidgetApiResponse = {
  role: string;
  assignments: {
    id: string;
    title: string;
    dueDate: string | null;
    studentName?: string;
  }[];
  nextLesson: { date: string; startTime: string | null; groupName: string | null } | null;
  hifz: { pagesMemorized: number; pagesTotal: number } | null;
};

/** Exactly what the native side stores; keep in step with the Swift decoder. */
export type WidgetPayload = {
  /** ISO — the widget renders "as of …" from this. */
  updatedAt: string;
  /** Headline row: the next thing to do, or a friendly empty state. */
  headline: string;
  headlineCaption: string | null;
  /** Further rows — a parent's other children, mostly. */
  items: { title: string; caption: string | null }[];
  lessonLabel: string;
  lessonValue: string | null;
  hifz: { label: string; value: string; percent: number } | null;
};

/** "Fr., 7. Aug · 17:30" — locale-formatted date, clock trimmed to h:mm. */
function lessonText(lesson: WidgetApiResponse["nextLesson"]): string | null {
  if (!lesson) return null;
  const day = formatDate(lesson.date, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  // `start_time` arrives as "17:30:00"; the seconds are noise on a widget.
  const time = lesson.startTime?.slice(0, 5);
  return time ? `${day} · ${time}` : day;
}

function dueText(dueDate: string | null): string {
  if (!dueDate) return tm("widgetNoDue");
  return tm("widgetDue", {
    date: formatDate(dueDate, { day: "numeric", month: "short" }),
  });
}

export function buildPayload(data: WidgetApiResponse): WidgetPayload {
  const [first, ...rest] = data.assignments;

  return {
    updatedAt: new Date().toISOString(),
    headline: first ? first.title : tm("widgetNoHomework"),
    headlineCaption: first
      ? // A parent sees several children's homework, so whose it is matters
        // more than when it is due; a student already knows whose it is.
        (first.studentName ?? dueText(first.dueDate))
      : null,
    items: rest.map((a) => ({
      title: a.title,
      caption: a.studentName ?? dueText(a.dueDate),
    })),
    lessonLabel: tm("widgetNextLesson"),
    lessonValue: lessonText(data.nextLesson) ?? tm("widgetNoLesson"),
    hifz: data.hifz
      ? {
          label: tm("widgetHifz"),
          value: tm("widgetPagesShort", {
            done: data.hifz.pagesMemorized,
            total: data.hifz.pagesTotal,
          }),
          percent: Math.round(
            (data.hifz.pagesMemorized / Math.max(1, data.hifz.pagesTotal)) * 100,
          ),
        }
      : null,
  };
}

