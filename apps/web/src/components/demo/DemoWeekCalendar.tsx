"use client";

import { useMemo, useState } from "react";

import { WeekCalendar } from "@/components/calendar/WeekCalendar";
import type { CalendarScope, CalendarWeek } from "@/lib/calendar-data";
import {
  calendarEvents,
  calendarSchedules,
} from "@/lib/demo-data";

/**
 * The demo-mode calendar body — the *same* WeekCalendar the real portals
 * render, fed with demo data instead of the database.
 *
 * The real pages push week/scope into the URL; the demo's "routes" are
 * component state, so the demo holds that state here and hands it to
 * `WeekCalendar` through its `onNavigate` prop. Everything the reader sees
 * (day rows, today outline, holiday band, cancelled strikethrough, week
 * switcher, scope toggle) is the real component, so the demo cannot drift
 * from the app.
 *
 * `dayOfWeek` in the demo data uses the JS convention (0 = Sunday), the same
 * as `Date.prototype.getDay()`, so a schedule row becomes a session on the
 * matching day of the displayed week.
 */

type DemoSchedule = (typeof calendarSchedules)[number];

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function mondayOf(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - ((copy.getDay() + 6) % 7));
  return copy;
}

function buildWeek(monday: Date, schedules: DemoSchedule[]): CalendarWeek {
  const sessions: CalendarWeek["sessions"] = schedules.map((s, i) => {
    const date = addDays(monday, (s.dayOfWeek + 6) % 7);
    return {
      id: `demo-${i}-${isoDate(date)}`,
      date: isoDate(date),
      startTime: s.startTime,
      endTime: s.endTime,
      isCancelled: false,
      notes: null,
      // The group name doubles as the id so `colorFor` hashes it to a stable
      // colour, exactly as the real calendar does for uncategorised groups.
      groupId: s.groupName,
      title: s.groupName,
      room: null,
      color: null,
    };
  });

  const events: CalendarWeek["events"] = calendarEvents.map((e, i) => {
    const date = addDays(monday, (e.dayOfWeek + 6) % 7);
    return {
      id: `demo-event-${i}`,
      title: e.title,
      description: e.description,
      date: isoDate(date),
      startTime: e.startTime,
      endTime: e.endTime,
    };
  });

  return {
    from: isoDate(monday),
    to: isoDate(addDays(monday, 6)),
    sessions,
    events,
    holidays: [],
  };
}

export function DemoWeekCalendar({
  mine = calendarSchedules,
  mosque = calendarSchedules,
}: {
  /** Sessions visible in "my lessons" scope (role-filtered). */
  mine?: DemoSchedule[];
  /** Sessions visible in "whole mosque" scope. */
  mosque?: DemoSchedule[];
}) {
  const [weekStart, setWeekStart] = useState(() => isoDate(mondayOf(new Date())));
  const [scope, setScope] = useState<CalendarScope>("mine");

  const schedules = scope === "mosque" ? mosque : mine;

  const week = useMemo(
    () => buildWeek(new Date(`${weekStart}T00:00:00`), schedules),
    [weekStart, schedules],
  );

  return (
    <WeekCalendar
      week={week}
      scope={scope}
      weekStart={weekStart}
      onNavigate={(next) => {
        if (next.week) setWeekStart(next.week);
        if (next.scope) setScope(next.scope);
      }}
    />
  );
}
