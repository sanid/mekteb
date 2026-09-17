"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, CalendarDays, Info, Printer, Download, Trash2, Plus, Calendar, MapPin } from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { FormField, inputCls } from "@/components/FormField";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { toggleOrSaveGroupSession, deleteSessionsForDates, deleteSessionsDuringHolidays, saveCalendarEvent, deleteCalendarEvent } from "./actions";
import { GroupScheduleModal } from "./GroupScheduleModal";

type Category = {
  id: string;
  name: string;
  color: string;
};

type Schedule = {
  category_id: string | null;
  group_id?: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

type Session = {
  id: string;
  date: string;
  category_id: string | null;
  group_id?: string | null;
  start_time: string;
  end_time: string;
  is_cancelled: boolean;
  notes: string | null;
  groups?: { id: string; name: string; room: string | null; group_categories: { color: string } | null } | null;
};

type Holiday = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
};

// Map standard weekday indexes (0 = Mon, ..., 6 = Sun)
// JS getDay() returns: 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat
function mapJsDayToScheduleDay(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1;
}

type GroupRow = {
  id: string;
  name: string;
  room: string | null;
  group_categories: { color: string } | null;
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

export function CalendarClient({
  categories,
  initialSchedules,
  initialSessions,
  holidays,
  groups,
  selectedYear,
  initialEvents,
}: {
  categories: Category[];
  initialSchedules: Schedule[];
  initialSessions: Session[];
  holidays: Holiday[];
  groups: GroupRow[];
  selectedYear: number;
  initialEvents: CalendarEvent[];
}) {
  const t = useTranslations("Admin");
  const params = useParams();
  const router = useRouter();
  const locale = String(params?.locale ?? "de");
  const [isPending, startTransition] = useTransition();

  const [editingGroup, setEditingGroup] = useState<GroupRow | null>(null);
  const [exportDay, setExportDay] = useState<number>(6); // Default to Saturday (6)
  const [selectMode, setSelectMode] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [groupsExpanded, setGroupsExpanded] = useState(false);

  // Events & Tab States
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [dialogTab, setDialogTab] = useState<"sessions" | "events">("sessions");
  const [groupSearchQuery, setGroupSearchQuery] = useState("");
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    start_time: "10:00",
    end_time: "12:00",
    visibilityType: "all",
    visibleRoles: [] as string[],
  });

  // Re-sync local events when the server sends a fresh list (after a
  // revalidate). Adjusted during render rather than in an effect so the
  // calendar never paints one frame of stale events.
  const [syncedEvents, setSyncedEvents] = useState(initialEvents);
  if (syncedEvents !== initialEvents) {
    setSyncedEvents(initialEvents);
    setEvents(initialEvents);
  }

  // Build per-group schedule lookup from initialSchedules (group_id !== null)
  const groupSchedules = new Map<string, Schedule[]>();
  for (const s of initialSchedules) {
    if (!s.group_id) continue;
    const arr = groupSchedules.get(s.group_id) ?? [];
    arr.push(s);
    groupSchedules.set(s.group_id, arr);
  }

  // Day editor state
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const initialSessionsRef = useRef<
    Record<
      string,
      {
        enabled: boolean;
        start_time: string;
        end_time: string;
        is_cancelled: boolean;
        notes: string;
      }
    >
  >({});
  // Track form values for each category on the selected day
  const [daySessions, setDaySessions] = useState<
    Record<
      string,
      {
        enabled: boolean;
        start_time: string;
        end_time: string;
        is_cancelled: boolean;
        notes: string;
      }
    >
  >({});

  const handleYearChange = (offset: number) => {
    router.push(`/admin/calendar?year=${selectedYear + offset}`);
  };

  const handleDayClick = (dateStr: string) => {
    if (selectMode) {
      setSelectedDates((prev) => {
        const next = new Set(prev);
        if (next.has(dateStr)) {
          next.delete(dateStr);
        } else {
          next.add(dateStr);
        }
        return next;
      });
      return;
    }

    const [y, m, dNum] = dateStr.split("-").map(Number);
    const jsDay = new Date(y, m - 1, dNum).getDay();
    const scheduleDay = mapJsDayToScheduleDay(jsDay);

    // Populate form state for each active group
    const initialFormValues: typeof daySessions = {};
    
    groups.forEach((g) => {
      const session = initialSessions.find((s) => s.date === dateStr && s.group_id === g.id);
      
      if (session) {
        initialFormValues[g.id] = {
          enabled: true,
          start_time: session.start_time.slice(0, 5),
          end_time: session.end_time.slice(0, 5),
          is_cancelled: session.is_cancelled,
          notes: session.notes ?? "",
        };
      } else {
        // Find default schedule for this group on this weekday
        const groupScheds = groupSchedules.get(g.id) ?? [];
        const daySched = groupScheds.find((s) => s.day_of_week === scheduleDay);
        const anySched = groupScheds[0];

        initialFormValues[g.id] = {
          enabled: false,
          start_time: daySched 
            ? daySched.start_time.slice(0, 5) 
            : anySched 
            ? anySched.start_time.slice(0, 5) 
            : "14:00",
          end_time: daySched 
            ? daySched.end_time.slice(0, 5) 
            : anySched 
            ? anySched.end_time.slice(0, 5) 
            : "16:00",
          is_cancelled: false,
          notes: "",
        };
      }
    });

    setGroupSearchQuery("");
    setDialogTab("sessions");
    setDaySessions(initialFormValues);
    initialSessionsRef.current = JSON.parse(JSON.stringify(initialFormValues));
    setSelectedDate(dateStr);
  };

  const handleDaySave = () => {
    if (!selectedDate) return;

    startTransition(async () => {
      const dirtyGroupIds = Object.keys(daySessions).filter((groupId) => {
        const val = daySessions[groupId];
        const init = initialSessionsRef.current[groupId];
        if (!init) return true;
        return (
          val.enabled !== init.enabled ||
          val.start_time !== init.start_time ||
          val.end_time !== init.end_time ||
          val.is_cancelled !== init.is_cancelled ||
          val.notes !== init.notes
        );
      });

      if (dirtyGroupIds.length === 0) {
        setSelectedDate(null);
        return;
      }

      // Execute dirty updates in parallel
      const results = await Promise.all(
        dirtyGroupIds.map(async (groupId) => {
          const val = daySessions[groupId];
          const res = await toggleOrSaveGroupSession(
            selectedDate,
            groupId,
            val.enabled,
            `${val.start_time}:00`,
            `${val.end_time}:00`,
            val.is_cancelled,
            val.notes
          );
          return { groupId, res };
        })
      );

      const errorResult = results.find((r) => "error" in r.res);
      if (errorResult && "error" in errorResult.res) {
        toast.error(errorResult.res.error);
      } else {
        toast.success(t("settingsSaved"));
        setSelectedDate(null);
        router.refresh();
      }
    });
  };

  const handleDeleteSelectedDates = () => {
    startTransition(async () => {
      const datesArray = Array.from(selectedDates);
      const res = await deleteSessionsForDates(datesArray);
      if ("error" in res) {
        toast.error(res.error);
      } else {
        toast.success(t("sessionsDeleted", { count: res.count }));
        setSelectedDates(new Set());
        setSelectMode(false);
        router.refresh();
      }
    });
  };

  const handleDeleteHolidays = () => {
    startTransition(async () => {
      const res = await deleteSessionsDuringHolidays(selectedYear);
      if ("error" in res) {
        toast.error(res.error);
      } else {
        toast.success(t("holidaySessionsDeleted", { count: res.count }));
        router.refresh();
      }
    });
  };

  const handleDeleteEvent = (eventId: string) => {
    startTransition(async () => {
      const res = await deleteCalendarEvent(eventId);
      if ("error" in res) {
        toast.error(res.error);
      } else {
        toast.success(t("eventDeleted"));
        setEvents((prev) => prev.filter((e) => e.id !== eventId));
        router.refresh();
      }
    });
  };

  const handleSaveEvent = () => {
    if (!newEvent.title.trim()) {
      toast.error(t("eventTitleRequired"));
      return;
    }
    if (!selectedDate) return;

    startTransition(async () => {
      const visibility = newEvent.visibilityType === "all"
        ? "all"
        : newEvent.visibleRoles.join(",");

      const res = await saveCalendarEvent({
        title: newEvent.title,
        description: newEvent.description || null,
        date: selectedDate,
        start_time: `${newEvent.start_time}:00`,
        end_time: `${newEvent.end_time}:00`,
        visibility,
      });

      if ("error" in res) {
        toast.error(res.error);
      } else {
        toast.success(t("eventSaved"));
        setNewEvent({
          title: "",
          description: "",
          start_time: "10:00",
          end_time: "12:00",
          visibilityType: "all",
          visibleRoles: [],
        });
        router.refresh();
      }
    });
  };

  const handleAddGroup = (groupId: string) => {
    setDaySessions((prev) => {
      const currentVal = prev[groupId];
      return {
        ...prev,
        [groupId]: {
          ...currentVal,
          enabled: true,
        },
      };
    });
    setGroupSearchQuery("");
  };

  // UI Helpers
  const getMonthName = (monthIdx: number) => {
    return new Intl.DateTimeFormat(locale, { month: "long" }).format(new Date(2026, monthIdx, 1));
  };

  const getDaysInMonth = (monthIdx: number) => {
    return new Date(selectedYear, monthIdx + 1, 0).getDate();
  };

  const getFirstDayOffset = (monthIdx: number) => {
    const day = new Date(selectedYear, monthIdx, 1).getDay();
    return day === 0 ? 6 : day - 1; // Mon=0, Sun=6
  };

  return (
    <div className="space-y-6">
      {/* ── Top Toolbar: Config Panel ───────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* PDF Export Card — always visible */}
        <div className="rounded-xl border border-card-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-card-border pb-3">
            <Printer className="h-5 w-5 text-accent" />
            <h3 className="font-semibold text-sm">{t("print")}</h3>
          </div>

          {groups.length === 0 ? (
            <p className="text-xs text-muted text-center py-2">
              {t("createGroupsFirst")}
            </p>
          ) : (
            <div className="space-y-3">
              <a
                href="/admin/calendar/pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-accent/20 bg-accent-subtle/20 hover:bg-accent-subtle/40 text-accent transition-colors p-2.5 text-xs font-semibold cursor-pointer"
              >
                <Download className="h-4 w-4" />
                {t("weeklySchedule")} (PDF)
              </a>

              <div className="border-t border-card-border pt-3 space-y-2">
                <label className="text-[11px] font-semibold text-muted block">
                  {t("exportDay")}
                </label>
                <div className="flex gap-2">
                  <select
                    className={`${inputCls} !py-1 text-xs`}
                    value={exportDay}
                    onChange={(e) => setExportDay(parseInt(e.target.value, 10))}
                  >
                    {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                      <option key={d} value={d}>
                        {new Intl.DateTimeFormat(locale, { weekday: "long" }).format(
                          new Date(2026, 4, 24 + d)
                        )}
                      </option>
                    ))}
                  </select>
                  <a
                    href={`/admin/calendar/pdf?day=${exportDay}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({ size: "sm" })}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bulk override / deletion card */}
        {groups.length > 0 && (
          <div className="rounded-xl border border-card-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-card-border pb-3">
              <CalendarDays className="h-5 w-5 text-danger" />
              <h3 className="font-semibold text-sm">
                {t("cleanUpSessions")}
              </h3>
            </div>

            <div className="space-y-3">
              <Button
                variant={selectMode ? "destructive" : "outline"}
                className="w-full cursor-pointer text-xs flex items-center justify-center gap-1.5"
                onClick={() => {
                  setSelectMode(!selectMode);
                  setSelectedDates(new Set());
                }}
              >
                {selectMode ? t("cancelSelection") : t("selectDeleteDays")}
              </Button>

              <div className="border-t border-card-border pt-3">
                <ConfirmDialog
                  title={t("cleanHolidaySessions")}
                  description={t("cleanHolidaySessionsDesc", { year: selectedYear })}
                  confirmLabel={t("deleteHolidaySessions")}
                  cancelLabel={t("cancel")}
                  onConfirm={handleDeleteHolidays}
                  trigger={
                    <Button
                      variant="outline"
                      className="w-full cursor-pointer text-xs border-danger/30 text-danger-fg hover:bg-danger-subtle"
                      disabled={isPending}
                    >
                      {t("deleteHolidaySessions")} ({selectedYear})
                    </Button>
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* Legend Card */}
        <div className="rounded-xl border border-card-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2 border-b border-card-border pb-3">
            <Info className="h-5 w-5 text-accent" />
            <h3 className="font-semibold text-sm">{t("calendarLegend")}</h3>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
            {groups.map((g) => (
              <div key={g.id} className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: g.group_categories?.color ?? "#6b7280" }}
                />
                <span className="truncate max-w-[10rem]">{g.name}</span>
              </div>
            ))}

            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full shrink-0 bg-info" />
              <span>{t("mosqueEvents")}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full shrink-0 border border-danger bg-transparent ring-1 ring-danger/20" />
              <span>{t("cancelled")}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm shrink-0 bg-warning/70 border border-warning/40" />
              <span>{t("schoolHolidays")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Calendar Year View ─────────────────────────────────────── */}
      <div className="space-y-6">
        {/* Year Selector */}
        <div className="flex items-center justify-between bg-card border border-card-border p-4 rounded-xl">
          <Button variant="outline" size="sm" onClick={() => handleYearChange(-1)}>
            <ChevronLeft className="h-4 w-4" />
            {selectedYear - 1}
          </Button>
          <span className="text-xl font-semibold">{selectedYear}</span>
          <Button variant="outline" size="sm" onClick={() => handleYearChange(1)}>
            {selectedYear + 1}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Collapsible Weekly Schedule (Groups List) */}
        <div className="rounded-xl border border-card-border bg-card p-5 space-y-4">
          <div
            className="flex items-center justify-between cursor-pointer select-none"
            onClick={() => setGroupsExpanded(!groupsExpanded)}
          >
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-accent" />
              <h2 className="font-semibold text-base">{t("weeklySchedule")}</h2>
              <span className="text-xs text-muted bg-accent-subtle/50 px-2.5 py-0.5 rounded-full font-semibold text-accent">
                {t("groupCount", { count: groups.length })}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted hidden sm:inline">
                {t("clickToEditSchedule")}
              </span>
              <Button variant="ghost" size="icon" className="h-8 w-8 p-0 cursor-pointer">
                {groupsExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted" />
                )}
              </Button>
            </div>
          </div>

          {groupsExpanded && (
            <div className="border-t border-card-border pt-4">
              {groups.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted">
                  <p>{t("noGroupsCta")}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 cursor-pointer"
                    onClick={() => router.push("/admin/groups")}
                  >
                    {t("groups")}
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {groups.map((g) => {
                    const scheds = (groupSchedules.get(g.id) ?? []).slice().sort(
                      (a, b) => a.day_of_week - b.day_of_week,
                    );
                    const color = g.group_categories?.color ?? "#6b7280";
                    const days = scheds.map((s) => s.day_of_week);
                    const startTime = scheds[0]?.start_time?.slice(0, 5) ?? "";
                    const endTime = scheds[0]?.end_time?.slice(0, 5) ?? "";
                    const dayLabels = days
                      .map((d) => t(`weekday_${d}` as "weekday_0"))
                      .join(", ");

                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setEditingGroup(g)}
                        className="text-left rounded-xl border border-card-border bg-background hover:bg-accent-subtle/40 transition-all hover:border-accent/40 p-3.5 cursor-pointer flex flex-col justify-between h-full group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="font-semibold text-sm truncate group-hover:text-accent transition-colors">{g.name}</span>
                        </div>
                        <div className="text-xs text-muted mt-2 border-t border-card-border/40 pt-1.5 flex items-center justify-between">
                          <span>
                            {scheds.length === 0
                              ? t("noSchedule")
                              : `${dayLabels}`}
                          </span>
                          {scheds.length > 0 && (
                            <span className="font-medium text-foreground">
                              {startTime}–{endTime}
                            </span>
                          )}
                        </div>
                        {g.room && (
                          <div className="text-xs text-muted mt-1 flex items-center gap-1">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{g.room}</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 12 Months Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 12 }).map((_, monthIdx) => {
            const daysInMonth = getDaysInMonth(monthIdx);
            const firstDayOffset = getFirstDayOffset(monthIdx);
            const monthName = getMonthName(monthIdx);

            return (
              <div key={monthIdx} className="rounded-xl border border-card-border bg-card p-4 space-y-3 select-none">
                <h3 className="font-semibold text-sm text-foreground text-center border-b border-card-border pb-2 capitalize">
                  {monthName}
                </h3>

                <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-muted mb-1">
                  <span>Mo</span>
                  <span>Di</span>
                  <span>Mi</span>
                  <span>Do</span>
                  <span>Fr</span>
                  <span>Sa</span>
                  <span>So</span>
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {/* Offset empty slots */}
                  {Array.from({ length: firstDayOffset }).map((_, i) => (
                    <div key={`offset-${i}`} />
                  ))}

                  {/* Month days */}
                  {Array.from({ length: daysInMonth }).map((_, dayIdx) => {
                    const dayNum = dayIdx + 1;
                    const dateStr = `${selectedYear}-${String(monthIdx + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;

                    // Check school holidays
                    const dayHolidays = holidays.filter((h) => dateStr >= h.start_date && dateStr <= h.end_date);
                    const isHoliday = dayHolidays.length > 0;
                    const holidayNames = dayHolidays.map((h) => h.name).join(", ");

                    // Check sessions
                    const daySessionsList = initialSessions.filter((s) => s.date === dateStr);
                    // Check generic calendar events
                    const dayEventsList = events.filter((e) => e.date === dateStr);

                    const isSelected = selectedDates.has(dateStr);

                    return (
                      <button
                        key={`day-${dayNum}`}
                        type="button"
                        onClick={() => handleDayClick(dateStr)}
                        className={`aspect-square rounded-lg flex flex-col items-center justify-between p-1 border text-[11px] font-semibold transition-all hover:scale-105 cursor-pointer relative group ${
                          isSelected
                            ? "ring-2 ring-danger border-danger bg-danger-subtle text-danger-fg"
                            : isHoliday
                            ? "bg-warning/50 text-warning-fg border-warning/40"
                            : "bg-background hover:bg-accent-subtle/40 border-card-border text-foreground"
                        }`}
                        title={isHoliday ? holidayNames : undefined}
                      >
                        <span className="z-10">{dayNum}</span>

                        {/* Session & Event indicators (colored dots) */}
                        <div className="flex gap-0.5 justify-center flex-wrap min-h-[4px] w-full">
                          {daySessionsList.map((session) => {
                            const cat = session.category_id
                              ? categories.find((c) => c.id === session.category_id)
                              : null;
                            const color = cat?.color ?? session.groups?.group_categories?.color ?? "#10b981";
                            const label = cat?.name ?? session.groups?.name ?? t("sessionFallback");
                            const room = session.groups?.room;
                            const titleText = room ? `${label} (${room})` : label;
                            return (
                              <span
                                key={session.id}
                                className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                                  session.is_cancelled ? "border border-danger bg-transparent ring-1 ring-danger/20" : ""
                                }`}
                                style={{ backgroundColor: session.is_cancelled ? undefined : color }}
                                title={
                                  session.is_cancelled
                                    ? t("cancelledPrefix", { label: titleText })
                                    : titleText
                                }
                              />
                            );
                          })}
                          {dayEventsList.map((ev) => (
                            <span
                              key={ev.id}
                              className="h-1.5 w-1.5 rounded-full shrink-0 bg-info"
                              title={`Event: ${ev.title} (${ev.start_time.slice(0, 5)} - ${ev.end_time.slice(0, 5)})`}
                            />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Floating selection bar (visible while choosing days to delete) ──── */}
      {selectMode && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-xl border border-card-border bg-card shadow-xl px-4 py-3">
          <span className="text-sm font-semibold text-danger-fg">
            {t("daysSelected", { count: selectedDates.size })}
          </span>
          <ConfirmDialog
            title={t("deleteSelectedDays")}
            description={t("deleteSelectedDaysDesc", { count: selectedDates.size })}
            confirmLabel={t("delete")}
            cancelLabel={t("cancel")}
            onConfirm={handleDeleteSelectedDates}
            trigger={
              <Button variant="destructive" size="sm" className="cursor-pointer" disabled={selectedDates.size === 0 || isPending}>
                {t("deleteSelectedDays")}
              </Button>
            }
          />
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={() => {
              setSelectMode(false);
              setSelectedDates(new Set());
            }}
          >
            {t("cancelSelection")}
          </Button>
        </div>
      )}

      {/* ── Day Override Configuration Modal ───────────────────────── */}
      <Dialog open={selectedDate !== null} onOpenChange={(open) => !open && setSelectedDate(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedDate
                ? new Date(selectedDate).toLocaleDateString(locale, {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : ""}
            </DialogTitle>
          </DialogHeader>

          {/* Show active holidays */}
          {selectedDate && (
            (() => {
              const dayHolidays = holidays.filter((h) => selectedDate >= h.start_date && selectedDate <= h.end_date);
              if (dayHolidays.length > 0) {
                return (
                  <div className="flex gap-2 rounded-xl bg-warning/10 text-warning-fg p-3 text-xs items-start border border-warning/20">
                    <Info className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Ferientag:</span>{" "}
                      {dayHolidays.map((h) => h.name).join(", ")}
                    </div>
                  </div>
                );
              }
              return null;
            })()
          )}

          {/* Dialog Tabs Selector */}
          <div className="flex border-b border-card-border mb-4 mt-2">
            <button
              type="button"
              className={`flex-1 pb-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                dialogTab === "sessions"
                  ? "border-accent text-accent"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
              onClick={() => setDialogTab("sessions")}
            >
              {t("manageSessions")}
            </button>
            <button
              type="button"
              className={`flex-1 pb-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                dialogTab === "events"
                  ? "border-accent text-accent"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
              onClick={() => setDialogTab("events")}
            >
              {t("mosqueEvents")}
            </button>
          </div>

          {/* Manage Sessions Tab Content */}
          {dialogTab === "sessions" && (
            <div className="space-y-4">
              {/* Autocomplete Search input to add a group */}
              <div className="relative">
                <FormField label={t("addGroup")}>
                  <input
                    type="text"
                    value={groupSearchQuery}
                    onChange={(e) => setGroupSearchQuery(e.target.value)}
                    placeholder={t("searchGroup")}
                    className={inputCls}
                  />
                </FormField>
                {groupSearchQuery.trim() !== "" && (
                  <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-popover border border-card-border rounded-xl shadow-xl p-1 space-y-0.5">
                    {(() => {
                      const inactiveGroups = groups.filter((g) => {
                        const sessionVal = daySessions[g.id];
                        const isAlreadyActive = sessionVal?.enabled === true;
                        const matchesSearch = g.name.toLowerCase().includes(groupSearchQuery.toLowerCase());
                        return !isAlreadyActive && matchesSearch;
                      });
                      if (inactiveGroups.length === 0) {
                        return (
                          <div className="text-xs text-muted p-2 text-center">
                            {t("noGroupsFound")}
                          </div>
                        );
                      }
                      return inactiveGroups.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => handleAddGroup(g.id)}
                          className="w-full text-left text-xs font-semibold px-3 py-2 rounded-lg hover:bg-accent-subtle hover:text-accent transition-colors cursor-pointer flex items-center gap-2"
                        >
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: g.group_categories?.color ?? "#6b7280" }}
                          />
                          {g.name}
                        </button>
                      ));
                    })()}
                  </div>
                )}
              </div>

              {/* Scrollable list of active groups */}
              <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-1">
                {(() => {
                  const activeGroups = groups.filter((g) => daySessions[g.id]?.enabled === true);
                  if (activeGroups.length === 0) {
                    return (
                      <div className="text-center py-8 border border-dashed border-card-border rounded-xl text-muted text-xs">
                        {t("noSessionsForDay")}
                      </div>
                    );
                  }
                  return activeGroups.map((group) => {
                    const values = daySessions[group.id];
                    const color = group.group_categories?.color ?? "#6b7280";
                    return (
                      <div key={group.id} className="rounded-xl border border-card-border p-4 space-y-3 bg-background relative">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="h-3.5 w-3.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                            <span className="font-semibold text-sm">{group.name}</span>
                            {group.room && (
                              <span className="inline-flex items-center gap-1 text-xs text-muted">
                                <MapPin className="h-3 w-3 shrink-0" />
                                {group.room}
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              setDaySessions((prev) => ({
                                ...prev,
                                [group.id]: { ...prev[group.id], enabled: false },
                              }))
                            }
                            className="p-1.5 text-muted hover:text-danger rounded-lg hover:bg-danger-subtle transition-colors cursor-pointer"
                            title={t("removeSession")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-card-border/40">
                          <div className="grid grid-cols-2 gap-3">
                            <FormField label={t("start_time")}>
                              <input
                                type="time"
                                value={values.start_time}
                                onChange={(e) =>
                                  setDaySessions((prev) => ({
                                    ...prev,
                                    [group.id]: { ...values, start_time: e.target.value },
                                  }))
                                }
                                className={inputCls}
                              />
                            </FormField>
                            <FormField label={t("end_time")}>
                              <input
                                type="time"
                                value={values.end_time}
                                onChange={(e) =>
                                  setDaySessions((prev) => ({
                                    ...prev,
                                    [group.id]: { ...values, end_time: e.target.value },
                                  }))
                                }
                                className={inputCls}
                              />
                            </FormField>
                          </div>

                          <div className="pt-1">
                            <label className="flex items-center gap-2 text-xs text-danger font-semibold cursor-pointer mb-2">
                              <input
                                type="checkbox"
                                checked={values.is_cancelled}
                                onChange={(e) =>
                                  setDaySessions((prev) => ({
                                    ...prev,
                                    [group.id]: { ...values, is_cancelled: e.target.checked },
                                  }))
                                }
                                className="rounded border-card-border text-danger accent-danger"
                              />
                              {t("cancelSession")}
                            </label>

                            {values.is_cancelled && (
                              <FormField label={t("cancellationNotes")}>
                                <input
                                  value={values.notes}
                                  onChange={(e) =>
                                    setDaySessions((prev) => ({
                                      ...prev,
                                      [group.id]: { ...values, notes: e.target.value },
                                    }))
                                  }
                                  placeholder="z.B. Feiertag / Ausfall"
                                  className={inputCls}
                                />
                              </FormField>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {/* Manage Mosque Events Tab Content */}
          {dialogTab === "events" && (
            <div className="space-y-6">
              {/* Existing Events List */}
              <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-1">
                <h4 className="font-semibold text-xs text-muted">
                  {t("currentEventsToday")}
                </h4>
                {(() => {
                  const dayEvents = events.filter((e) => e.date === selectedDate);
                  if (dayEvents.length === 0) {
                    return (
                      <div className="text-center py-6 border border-dashed border-card-border rounded-xl text-muted text-xs">
                        {t("noMosqueEventsToday")}
                      </div>
                    );
                  }
                  return dayEvents.map((ev) => (
                    <div key={ev.id} className="rounded-xl border border-card-border bg-background p-3.5 space-y-2 relative">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-foreground">{ev.title}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteEvent(ev.id)}
                          disabled={isPending}
                          className="p-1.5 text-muted hover:text-danger rounded-lg hover:bg-danger-subtle transition-colors cursor-pointer"
                          title={t("eventTitle")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      {ev.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed">{ev.description}</p>
                      )}
                      <div className="flex items-center justify-between text-[11px] text-muted pt-1 border-t border-card-border/40">
                        <span>Zeit: {ev.start_time.slice(0, 5)} - {ev.end_time.slice(0, 5)}</span>
                        <span className="bg-accent-subtle/50 text-accent px-2 py-0.5 rounded-full font-semibold">
                          {ev.visibility === "all"
                            ? t("eventVisibilityAll")
                            : t("eventVisibilityRoles")}
                        </span>
                      </div>
                    </div>
                  ));
                })()}
              </div>

              {/* Add Event Form */}
              <div className="border-t border-card-border pt-4 space-y-4">
                <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="h-4 w-4 text-accent" />
                  {t("addEvent")}
                </h4>
                <div className="space-y-3 bg-accent-subtle/10 border border-accent/10 rounded-xl p-4">
                  <FormField label={t("eventTitle")}>
                    <input
                      type="text"
                      value={newEvent.title}
                      onChange={(e) => setNewEvent((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder={t("eventTitlePlaceholder")}
                      className={inputCls}
                    />
                  </FormField>

                  <FormField label={t("eventDescription")}>
                    <textarea
                      value={newEvent.description}
                      onChange={(e) => setNewEvent((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder={t("eventDescriptionPlaceholder")}
                      className={`${inputCls} resize-none h-16`}
                    />
                  </FormField>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField label={t("eventStartTime")}>
                      <input
                        type="time"
                        value={newEvent.start_time}
                        onChange={(e) => setNewEvent((prev) => ({ ...prev, start_time: e.target.value }))}
                        className={inputCls}
                      />
                    </FormField>
                    <FormField label={t("eventEndTime")}>
                      <input
                        type="time"
                        value={newEvent.end_time}
                        onChange={(e) => setNewEvent((prev) => ({ ...prev, end_time: e.target.value }))}
                        className={inputCls}
                      />
                    </FormField>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold text-muted block">
                      {t("visibility")}
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                        <input
                          type="radio"
                          name="visibilityType"
                          value="all"
                          checked={newEvent.visibilityType === "all"}
                          onChange={() => setNewEvent((prev) => ({ ...prev, visibilityType: "all" }))}
                          className="text-accent accent-accent"
                        />
                        {t("allMembers")}
                      </label>
                      <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                        <input
                          type="radio"
                          name="visibilityType"
                          value="roles"
                          checked={newEvent.visibilityType === "roles"}
                          onChange={() => setNewEvent((prev) => ({ ...prev, visibilityType: "roles" }))}
                          className="text-accent accent-accent"
                        />
                        {t("specificRoles")}
                      </label>
                    </div>
                  </div>

                  {newEvent.visibilityType === "roles" && (
                    <div className="space-y-1.5 bg-background border border-card-border rounded-lg p-3">
                      <label className="text-[11px] font-semibold text-muted block mb-1">
                        {t("selectRoles")}
                      </label>
                      {[
                        { key: "teacher", label: t("roleTeachers") },
                        { key: "assistant", label: t("roleAssistants") },
                        { key: "examiner", label: t("roleExaminers") },
                        { key: "parent", label: t("roleParents") },
                        { key: "student", label: t("roleStudents") },
                      ].map((roleOption) => {
                        const checked = newEvent.visibleRoles.includes(roleOption.key);
                        return (
                          <label key={roleOption.key} className="flex items-center gap-2 text-xs font-semibold cursor-pointer font-sans">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                setNewEvent((prev) => {
                                  const nextRoles = e.target.checked
                                    ? [...prev.visibleRoles, roleOption.key]
                                    : prev.visibleRoles.filter((r) => r !== roleOption.key);
                                  return { ...prev, visibleRoles: nextRoles };
                                });
                              }}
                              className="rounded border-card-border text-accent accent-accent"
                            />
                            {roleOption.label}
                          </label>
                        );
                      })}
                    </div>
                  )}

                  <Button
                    type="button"
                    onClick={handleSaveEvent}
                    disabled={isPending}
                    className="mt-1 w-full"
                  >
                    {t("saveEvent")}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            {dialogTab === "sessions" ? (
              <>
                <Button variant="outline" onClick={() => setSelectedDate(null)} disabled={isPending}>
                  {t("cancel")}
                </Button>
                <Button onClick={handleDaySave} disabled={isPending}>
                  {t("save")}
                </Button>
              </>
            ) : (
              <Button onClick={() => setSelectedDate(null)} className="w-full font-semibold">
                {t("close")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editingGroup && (() => {
        const scheds = groupSchedules.get(editingGroup.id) ?? [];
        const initWeekdays = scheds.map((s) => s.day_of_week);
        const initStart = scheds[0]?.start_time ?? "10:00:00";
        const initEnd = scheds[0]?.end_time ?? "12:00:00";
        return (
          <GroupScheduleModal
            group={{ id: editingGroup.id, name: editingGroup.name }}
            initialWeekdays={initWeekdays}
            initialStartTime={initStart}
            initialEndTime={initEnd}
            onClose={() => setEditingGroup(null)}
          />
        );
      })()}
    </div>
  );
}
