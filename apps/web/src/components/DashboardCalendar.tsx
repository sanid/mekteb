"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Calendar, AlertCircle, MapPin } from "lucide-react";
import { dateFormatLocale } from "@/lib/format";

type Session = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_cancelled: boolean;
  notes: string | null;
  category_id: string | null;
  group_id?: string | null;
  // Either the category directly (legacy category-level schedules) or the
  // group's category (per-group schedules) supplies the dot color and name.
  group_categories: { name: string; color: string } | null;
  groups?: {
    id: string;
    name: string;
    room?: string | null;
    group_categories: { name: string; color: string } | null;
  } | null;
};

function sessionLabel(session: Session, fallback: string): { name: string; color: string } {
  if (session.groups) {
    return {
      name: session.groups.name,
      color: session.groups.group_categories?.color ?? "#6b7280",
    };
  }
  if (session.group_categories) {
    return { name: session.group_categories.name, color: session.group_categories.color };
  }
  return { name: fallback, color: "#6b7280" };
}

type Holiday = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
};

type CalendarEvent = {
  id: string;
  title: string;
  description: string | null;
  date: string;
  start_time: string;
  end_time: string;
  visibility: string;
};

export function DashboardCalendar({
  sessions,
  holidays,
  events = [],
  sessionBasePath,
}: {
  sessions: Session[];
  holidays: Holiday[];
  events?: CalendarEvent[];
  /** Optional base path (e.g. "/admin/groups" or "/teacher/groups").
   *  When set, session dots become clickable: navigates to
   *  `{sessionBasePath}/{group_id}?date={date}` */
  sessionBasePath?: string;
}) {
  const t = useTranslations("Admin");
  // BCP-47 tag, not the bare app code — keeps Intl output identical to
  // everywhere else that formats dates.
  const locale = dateFormatLocale(useLocale());
  const router = useRouter();

  const now = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1));

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handleMonthChange = (offset: number) => {
    setCurrentDate(new Date(year, month + offset, 1));
  };

  // Date utilities
  const monthName = new Intl.DateTimeFormat(locale, { month: "long" }).format(currentDate);

  // Weekday headers, Monday-first to match the grid offset below. Derived from
  // Intl rather than hardcoded — these used to read "Mo Di Mi Do Fr Sa So" in
  // every language. 2024-01-01 was a Monday, so it anchors the sequence.
  const weekdayLabels = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(2024, 0, 1 + i)),
  );
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOffset = (() => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Mon=0, Sun=6
  })();

  // Filter sessions for currently active month
  const activeMonthSessions = sessions.filter((s) => {
    const sDate = new Date(s.date);
    return sDate.getFullYear() === year && sDate.getMonth() === month;
  });

  // Next upcoming sessions (from today onwards, limit 5)
  const todayStr = now.toISOString().slice(0, 10);
  const upcomingSessions = sessions
    .filter((s) => s.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 rounded-xl border border-card-border bg-card p-5">
      {/* ── Monthly Grid (2/3 width) ────────────────────────────────── */}
      <div className="md:col-span-2 space-y-4">
        <div className="flex items-center justify-between border-b border-card-border pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-accent" />
            <h3 className="font-semibold text-sm text-foreground uppercase tracking-wider">{t("mosqueCalendar")}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleMonthChange(-1)}
              className="p-1 rounded-lg border border-card-border hover:bg-accent-subtle transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold min-w-[90px] text-center capitalize">
              {monthName} {year}
            </span>
            <button
              onClick={() => handleMonthChange(1)}
              className="p-1 rounded-lg border border-card-border hover:bg-accent-subtle transition-colors cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-muted">
          {weekdayLabels.map((label, i) => (
            <span key={i}>{label}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {/* Offset days */}
          {Array.from({ length: firstDayOffset }).map((_, i) => (
            <div key={`offset-${i}`} />
          ))}

          {/* Month days */}
          {Array.from({ length: daysInMonth }).map((_, dayIdx) => {
            const dayNum = dayIdx + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;

            // Check holidays
            const dayHolidays = holidays.filter((h) => dateStr >= h.start_date && dateStr <= h.end_date);
            const isHoliday = dayHolidays.length > 0;
            const holidayNames = dayHolidays.map((h) => h.name).join(", ");
            // Check sessions
            const daySessions = activeMonthSessions.filter((s) => s.date === dateStr);
            // Check generic events
            const dayEvents = (events ?? []).filter((e) => e.date === dateStr);

            return (
              <div
                key={`day-${dayNum}`}
                className={`aspect-square rounded-lg flex flex-col items-center justify-between p-1 border text-[11px] font-semibold relative ${
                  isHoliday
                    ? "bg-warning/40 text-warning-fg border-warning/30"
                    : "bg-background/45 border-card-border/60 text-foreground"
                }`}
                title={isHoliday ? holidayNames : undefined}
              >
                <span>{dayNum}</span>

                {/* Dots for active categories and generic events */}
                <div className="flex gap-0.5 justify-center flex-wrap min-h-[4px] w-full">
                  {daySessions.map((session) => {
                    const label = sessionLabel(session, t("noCategory"));
                    const href = sessionBasePath && session.group_id
                      ? `${sessionBasePath}/${session.group_id}?date=${session.date}`
                      : null;
                    const dotClass = `h-1.5 w-1.5 rounded-full shrink-0 ${
                      session.is_cancelled ? "border border-danger bg-transparent ring-1 ring-danger/25" : ""
                    } ${href ? "cursor-pointer hover:scale-125 transition-transform" : ""}`;
                    const dotStyle = { backgroundColor: session.is_cancelled ? undefined : label.color };
                    const labelWithRoom = session.groups?.room ? `${label.name} (${session.groups.room})` : label.name;
                    const dotTitle = session.is_cancelled ? t("cancelledPrefix", { label: labelWithRoom }) : labelWithRoom;
                    return href ? (
                      <button
                        key={session.id}
                        type="button"
                        className={dotClass}
                        style={dotStyle}
                        title={dotTitle}
                        onClick={(e) => { e.stopPropagation(); router.push(href); }}
                      />
                    ) : (
                      <span
                        key={session.id}
                        className={dotClass}
                        style={dotStyle}
                        title={dotTitle}
                      />
                    );
                  })}
                  {dayEvents.map((event) => (
                    <span
                      key={event.id}
                      className="h-1.5 w-1.5 rounded-full shrink-0 bg-info"
                      title={`Event: ${event.title} (${event.start_time.slice(0, 5)} - ${event.end_time.slice(0, 5)})`}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Upcoming Sessions List (1/3 width) ───────────────────────── */}
      <div className="md:col-span-1 border-t md:border-t-0 md:border-l border-card-border pt-4 md:pt-0 md:pl-5 space-y-4">
        <h4 className="font-semibold text-sm text-foreground uppercase tracking-wider">
          {t("upcomingSessions")}
        </h4>

        {upcomingSessions.length > 0 ? (
          <ul className="space-y-3">
            {upcomingSessions.map((session) => {
              const label = sessionLabel(session, t("noCategory"));
              const formattedDate = new Date(session.date).toLocaleDateString(locale, {
                weekday: "short",
                month: "short",
                day: "numeric",
              });

              const upcomingHref = sessionBasePath && session.group_id
                ? `${sessionBasePath}/${session.group_id}?date=${session.date}`
                : null;
              return (
                <li
                  key={session.id}
                  onClick={upcomingHref ? () => router.push(upcomingHref) : undefined}
                  className={`rounded-xl border p-3 space-y-1.5 transition-all text-xs bg-background/50 hover:bg-background ${
                    session.is_cancelled
                      ? "border-danger/25 bg-danger/5"
                      : "border-card-border"
                  } ${upcomingHref ? "cursor-pointer hover:border-accent/40" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: label.color }}
                      />
                      <span className="font-semibold truncate">{label.name}</span>
                    </div>

                    <span className="text-[11px] text-muted whitespace-nowrap">{formattedDate}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>
                      {session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}{t("timeSuffix") ? ` ${t("timeSuffix")}` : ""}
                    </span>

                    {session.is_cancelled && (
                      <span className="rounded-full bg-danger-subtle text-danger-fg font-semibold px-1.5 py-0.5 text-[11px]">
                        {t("cancelled")}
                      </span>
                    )}
                  </div>

                  {session.groups?.room && (
                    <div className="flex items-center gap-1 text-[11px] text-muted">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{session.groups.room}</span>
                    </div>
                  )}

                  {session.is_cancelled && session.notes && (
                    <div className="flex gap-1.5 text-[11px] text-danger-fg mt-1.5 items-start font-medium leading-tight">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>{session.notes}</span>
                    </div>
                  )}

                  {!session.is_cancelled && session.notes && (
                    <p className="text-[11px] text-muted leading-tight mt-1 truncate italic">
                      {session.notes}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-center py-8 text-xs text-muted">{t("noUpcomingSessions")}</div>
        )}
      </div>
    </div>
  );
}
