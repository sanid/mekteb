"use client";

import { useMemo, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePathname } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import { CalendarRange, ChevronLeft, ChevronRight, Megaphone } from "lucide-react";

import type {
  CalendarHoliday,
  CalendarScope,
  CalendarWeek,
} from "@/lib/calendar-data";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { panelCard } from "@/components/ui/surfaces";

/**
 * The reader's week, in the same shape the mobile app shows: seven day rows,
 * today outlined, holidays as a band, cancelled lessons struck through.
 *
 * Week and scope live in the URL rather than component state, so a link to a
 * particular week is a link to that week — the page is a server component that
 * fetches on navigation, which also means no client-side data layer here.
 */

const FALLBACK_COLORS = ["#0ea5e9", "#8b5cf6", "#f59e0b", "#ec4899", "#14b8a6", "#ef4444"];

/** Stable colour for a group whose category has none, so a week is legible. */
function colorFor(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length];
}

/**
 * Holiday *names* covering a date, deduplicated — a federal state can carry
 * two overlapping rows for the same break, which read as "Sommerferien 2026 ·
 * Sommerferien 2026".
 */
function holidayNamesOn(date: string, holidays: CalendarHoliday[]): string[] {
  return [
    ...new Set(
      holidays.filter((h) => h.startDate <= date && h.endDate >= date).map((h) => h.name),
    ),
  ];
}

function shortTime(value: string | null): string | null {
  return value ? value.slice(0, 5) : null;
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

export function WeekCalendar({
  week,
  scope,
  weekStart,
  onNavigate,
}: {
  week: CalendarWeek;
  scope: CalendarScope;
  /** Monday of the displayed week, as `YYYY-MM-DD`. */
  weekStart: string;
  /**
   * When given, week/scope changes call this instead of pushing to the URL.
   * The demo mode renders this component with in-page state (its "routes"
   * are component state, not URLs), so it must not navigate the router.
   */
  onNavigate?: (next: { week?: string; scope?: CalendarScope }) => void;
}) {
  const t = useTranslations("Calendar");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const monday = useMemo(() => new Date(`${weekStart}T00:00:00`), [weekStart]);
  const today = isoDate(new Date());

  const go = (next: { week?: string; scope?: CalendarScope }) => {
    if (onNavigate) {
      onNavigate(next);
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    if (next.week) params.set("week", next.week);
    if (next.scope) params.set("scope", next.scope);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const date = addDays(monday, i);
        const iso = isoDate(date);
        return {
          iso,
          date,
          sessions: week.sessions.filter((s) => s.date === iso),
          events: week.events.filter((e) => e.date === iso),
          holidays: holidayNamesOn(iso, week.holidays),
        };
      }),
    [monday, week],
  );

  const thisWeekStart = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return isoDate(d);
  })();

  return (
    <div className={cn("space-y-4", isPending && "opacity-60 transition-opacity")}>
      {/* Week switcher + scope */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={t("previousWeek")}
            onClick={() => go({ week: isoDate(addDays(monday, -7)) })}
            className="rounded-lg border border-card-border p-2 hover:border-accent/40 hover:text-accent transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-[13rem] text-center">
            <p className="font-semibold">
              {formatDate(monday, locale, { day: "numeric", month: "short" })} –{" "}
              {formatDate(addDays(monday, 6), locale, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
            {weekStart === thisWeekStart ? (
              <p className="text-xs text-muted">{t("thisWeek")}</p>
            ) : (
              <button
                type="button"
                onClick={() => go({ week: thisWeekStart })}
                className="text-xs font-medium text-accent hover:underline"
              >
                {t("backToToday")}
              </button>
            )}
          </div>
          <button
            type="button"
            aria-label={t("nextWeek")}
            onClick={() => go({ week: isoDate(addDays(monday, 7)) })}
            className="rounded-lg border border-card-border p-2 hover:border-accent/40 hover:text-accent transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div
          role="group"
          aria-label={t("scope")}
          className="flex gap-1 rounded-lg border border-card-border bg-surface p-1"
        >
          {(["mine", "mosque"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={scope === value}
              onClick={() => go({ scope: value })}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                scope === value
                  ? "bg-card text-accent font-semibold shadow-sm"
                  : "text-muted hover:text-foreground",
              )}
            >
              {value === "mine" ? t("myLessons") : t("wholeMosque")}
            </button>
          ))}
        </div>
      </div>

      {/* Seven days. Two columns on wide screens: a week of mostly-empty days
          is a lot of vertical scrolling on a desktop otherwise. `items-start`
          matters — without it a quiet Monday stretches to the height of a
          Tuesday with thirteen lessons and the page is mostly empty box. */}
      <div className="grid items-start gap-3 lg:grid-cols-2">
        {days.map((day) => {
          const isToday = day.iso === today;
          const empty = day.sessions.length === 0 && day.events.length === 0;

          return (
            <section
              key={day.iso}
              className={cn(
                panelCard,
                "bg-card",
                isToday && "border-accent ring-1 ring-accent/30",
              )}
            >
              <header
                className={cn(
                  "flex items-baseline gap-2 px-4 py-2.5",
                  isToday ? "bg-accent-subtle" : "bg-surface",
                )}
              >
                <h3
                  className={cn(
                    "text-xs font-semibold uppercase tracking-wider",
                    isToday ? "text-accent" : "text-muted",
                  )}
                >
                  {formatDate(day.date, locale, { weekday: "long" })}
                </h3>
                <span className={cn("text-xs", isToday ? "text-accent" : "text-muted")}>
                  {formatDate(day.date, locale, { day: "numeric", month: "short" })}
                </span>
                {day.sessions.length > 0 && (
                  <span className="ml-auto text-xs font-semibold text-muted">
                    {day.sessions.length}
                  </span>
                )}
              </header>

              {day.holidays.length > 0 && (
                <p className="flex items-center gap-2 bg-warning/60 px-4 py-1.5 text-xs text-warning-fg">
                  <CalendarRange className="h-3.5 w-3.5 shrink-0" />
                  {day.holidays.join(" · ")}
                </p>
              )}

              {empty ? (
                <p className="px-4 py-3 text-sm text-muted">{t("nothingScheduled")}</p>
              ) : (
                <ul className="divide-y divide-card-border">
                  {day.sessions.map((s) => (
                    <li key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                      <span
                        className={cn(
                          "w-12 shrink-0 text-sm font-semibold tabular-nums",
                          s.isCancelled && "text-muted",
                        )}
                      >
                        {shortTime(s.startTime) ?? "—"}
                        {shortTime(s.endTime) && (
                          <span className="block text-[11px] font-normal text-muted">
                            {shortTime(s.endTime)}
                          </span>
                        )}
                      </span>
                      <span
                        aria-hidden
                        className="h-7 w-[3px] shrink-0 rounded-full"
                        style={{
                          backgroundColor: s.isCancelled
                            ? "var(--card-border)"
                            : (s.color ?? colorFor(s.groupId ?? s.id)),
                        }}
                      />
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block truncate text-sm font-medium",
                            s.isCancelled && "text-muted line-through",
                          )}
                        >
                          {s.title ?? t("lesson")}
                        </span>
                        {(s.room || s.notes) && (
                          <span className="block truncate text-xs text-muted">
                            {[s.room, s.notes].filter(Boolean).join(" · ")}
                          </span>
                        )}
                      </span>
                      {s.isCancelled && (
                        <span className="shrink-0 text-[11px] font-semibold uppercase text-danger-fg">
                          {t("cancelled")}
                        </span>
                      )}
                    </li>
                  ))}

                  {day.events.map((e) => (
                    <li key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="w-12 shrink-0 text-sm tabular-nums text-muted">
                        {shortTime(e.startTime) ?? "—"}
                      </span>
                      <Megaphone className="h-4 w-4 shrink-0 text-info" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {e.title}
                        </span>
                        {e.description && (
                          <span className="block truncate text-xs text-muted">
                            {e.description}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
