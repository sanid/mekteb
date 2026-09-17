
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Platform, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { api } from "@/lib/api";
import { getPref, PREF_CALENDAR_SCOPE, setPref } from "@/lib/prefs";
import { invalidate, useResource } from "@/lib/resource";
import { formatDate, tm } from "@/lib/i18n";
import { hasRole } from "@/lib/session";
import { useSession } from "@/lib/session-context";
import type {
  CalendarHoliday,
  CalendarSession,
  CalendarWeek,
} from "@/lib/types";
import { ErrorNotice, FirstLoad, SegmentedTabs } from "@/components/ui";
import { Icon } from "@/components/icon";
import { radius, space, usePalette, type Palette } from "@/theme";

/**
 * Lesson times, rendered width-aligned on both platforms.
 *
 * `fontVariant: ["tabular-nums"]` is iOS-only — Android silently ignores it,
 * so a column of "07:30 / 17:30" times jitters because proportional digits
 * have different widths. On Android the same effect comes from a monospace
 * family; keep the tabular variant on iOS, which preserves the app's font.
 * Times are already zero-padded to HH:MM by `shortTime`.
 */
const TIME_TEXT = {
  fontVariant: ["tabular-nums" as const],
  fontFamily: Platform.select({ android: "monospace", default: undefined }),
};

/**
 * The week everyone shares: which lessons happen on which day, plus mosque
 * events and the school holidays that explain an empty week.
 *
 * A whole week at once rather than a day picker. On a phone the useful
 * question is "when is my next lesson", and a day-at-a-time view answers it
 * only by making the reader tap through six empty days to find out.
 *
 * Two scopes, and every role gets both. "Mine" is the default because it
 * answers that question in one glance; "the mosque" is how a family finds out
 * that a Saturday Hifz class exists at all. The choice is remembered, since
 * whichever one you want is the one you want every time.
 */
type Scope = "mine" | "mosque";

/** `YYYY-MM-DD` in *local* time — `toISOString()` would shift the day in UTC+X. */
function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Weeks start on Monday — the mosque week, and the German convention. */
function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - ((copy.getDay() + 6) % 7));
  return copy;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

/** "14:30" from "14:30:00" — the seconds are noise on a timetable. */
function shortTime(value: string | null): string | null {
  return value ? value.slice(0, 5) : null;
}

/**
 * A stable colour for a group that has no category.
 *
 * Most seeded groups have no category and therefore no colour, and a week of
 * identical grey bars is unreadable. Hashing the id keeps a group the same
 * colour every week without the server having to invent one.
 */
const FALLBACK_COLORS = ["#15803d", "#2f6f86", "#b7791f", "#8a5a9e", "#5c685f", "#c2412d"];

function sessionColor(session: CalendarSession, palette: Palette): string {
  if (session.color) return session.color;
  const key = session.groupId ?? session.id;
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length] ?? palette.accent;
}

/**
 * Holiday *names* covering a date, deduplicated.
 *
 * A federal state can carry two overlapping rows for the same break — Berlin
 * has two "Sommerferien 2026" with different ranges — which rendered as
 * "Sommerferien 2026 · Sommerferien 2026". The reader cares that it is the
 * summer holidays, not how many rows say so.
 */
function holidayNamesOn(date: string, holidays: CalendarHoliday[]): string[] {
  return [
    ...new Set(
      holidays.filter((h) => h.startDate <= date && h.endDate >= date).map((h) => h.name),
    ),
  ];
}

export default function CalendarScreen() {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const isTeacher = hasRole(session, "teacher");

  const today = useMemo(() => isoDate(new Date()), []);
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [scope, setScope] = useState<Scope>("mine");

  // Restored rather than awaited: the personal week is the right first paint
  // for most people, and blocking the screen on the keychain to find out is a
  // worse trade than one quiet refetch for those who chose otherwise.
  useEffect(() => {
    void getPref(PREF_CALENDAR_SCOPE).then((stored) => {
      if (stored === "mosque") setScope("mosque");
    });
  }, []);

  // `SegmentedTabs` already ignores a no-op tap and fires the haptic.
  const chooseScope = (next: Scope) => {
    setScope(next);
    void setPref(PREF_CALENDAR_SCOPE, next);
  };

  const from = isoDate(weekStart);
  const to = isoDate(addDays(weekStart, 6));

  const { data, error, refreshing, refresh } = useResource<CalendarWeek>(
    // The scope is part of the cache key — the two weeks hold different rows.
    `calendar/${scope}/${from}`,
    useCallback(
      () => api<CalendarWeek>(`/calendar?from=${from}&to=${to}&scope=${scope}`),
      [from, to, scope],
    ),
    { fallbackError: tm("calendarLoadFailed") },
  );

  /**
   * Teachers cancel from the calendar itself: tap a lesson, confirm. The
   * students and their parents are notified by the DB trigger — this screen
   * only flips the flag and reloads the week.
   */
  const setCancelled = async (s: CalendarSession, cancelled: boolean) => {
    try {
      await api(`/calendar/sessions/${s.id}`, {
        method: "PATCH",
        body: { is_cancelled: cancelled },
      });
      invalidate("calendar");
      void refresh();
    } catch {
      Alert.alert(
        tm("genericError"),
        cancelled ? tm("lessonCancelFailed") : tm("lessonRestoreFailed"),
      );
    }
  };

  const askCancel = (s: CalendarSession) => {
    const cancelled = !s.isCancelled;
    const label = cancelled ? tm("cancelLesson") : tm("restoreLesson");
    Alert.alert(
      label,
      s.title ?? tm("lesson"),
      [
        { text: tm("close"), style: "cancel" },
        {
          text: label,
          style: cancelled ? "destructive" : "default",
          onPress: () => void setCancelled(s, cancelled),
        },
      ],
    );
  };

  const shiftWeek = (delta: number) => {
    void Haptics.selectionAsync();
    setWeekStart((current) => addDays(current, delta * 7));
  };

  const isCurrentWeek = from === isoDate(startOfWeek(new Date()));

  /** Seven day buckets, so an empty day still renders as an empty day. */
  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      const iso = isoDate(date);
      return {
        iso,
        date,
        sessions: (data?.sessions ?? []).filter((s) => s.date === iso),
        events: (data?.events ?? []).filter((e) => e.date === iso),
        holidays: holidayNamesOn(iso, data?.holidays ?? []),
      };
    });
  }, [weekStart, data]);

  const weekLabel = `${formatDate(weekStart, { day: "numeric", month: "short" })} – ${formatDate(
    addDays(weekStart, 6),
    { day: "numeric", month: "short", year: "numeric" },
  )}`;

  // Only the very first load blanks the screen; paging to another week keeps
  // the current one on screen while the next arrives.
  if (data === null) {
    return (
      <>
        <Stack.Screen options={{ title: tm("calendar") }} />
        <FirstLoad error={error} />
      </>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <Stack.Screen options={{ title: tm("calendar") }} />

      {/* Week switcher — pinned, so paging weeks never means scrolling back up */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: space.sm,
          paddingHorizontal: space.lg,
          paddingVertical: space.md,
          borderBottomWidth: 1,
          borderBottomColor: palette.cardBorder,
          backgroundColor: palette.surface,
        }}
      >
        <WeekArrow direction="back" onPress={() => shiftWeek(-1)} />
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: palette.foreground }}>
            {weekLabel}
          </Text>
          {!isCurrentWeek ? (
            <Pressable onPress={() => setWeekStart(startOfWeek(new Date()))} hitSlop={8}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: palette.accent }}>
                {tm("backToToday")}
              </Text>
            </Pressable>
          ) : (
            <Text style={{ fontSize: 12, color: palette.faint }}>{tm("thisWeek")}</Text>
          )}
        </View>
        <WeekArrow direction="forward" onPress={() => shiftWeek(1)} />
      </View>

      <SegmentedTabs
        options={[
          { value: "mine", label: tm("myLessons") },
          { value: "mosque", label: tm("wholeMosque") },
        ]}
        value={scope}
        onChange={chooseScope}
        style={{ margin: space.lg, marginBottom: 0 }}
      />

      <ScrollView
        contentContainerStyle={{
          padding: space.lg,
          paddingBottom: insets.bottom + space.xxl,
          gap: space.md,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={palette.accent}
          />
        }
      >
        {error ? <ErrorNotice message={error} /> : null}

        {days.map((day, i) => (
          <Animated.View key={day.iso} entering={FadeInDown.delay(i * 30).duration(200)}>
            <DayBlock
              date={day.date}
              isToday={day.iso === today}
              sessions={day.sessions}
              events={day.events}
              holidays={day.holidays}
              onSessionPress={isTeacher ? askCancel : undefined}
            />
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
}

function WeekArrow({
  direction,
  onPress,
}: {
  direction: "back" | "forward";
  onPress: () => void;
}) {
  const palette = usePalette();
  const back = direction === "back";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={tm(back ? "previousWeek" : "nextWeek")}
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => ({
        width: 38,
        height: 38,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: palette.cardBorder,
        backgroundColor: palette.card,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.6 : 1,
        // One glyph, mirrored, rather than a second icon import.
        transform: [{ scaleX: back ? -1 : 1 }],
      })}
    >
      <Icon name="chevron" size={18} color={palette.foreground} />
    </Pressable>
  );
}

function DayBlock({
  date,
  isToday,
  sessions,
  events,
  holidays,
  onSessionPress,
}: {
  date: Date;
  isToday: boolean;
  sessions: CalendarSession[];
  events: { id: string; title: string; startTime: string | null }[];
  holidays: string[];
  /** Teachers tap a lesson to cancel/restore it. */
  onSessionPress?: (session: CalendarSession) => void;
}) {
  const palette = usePalette();
  const empty = sessions.length === 0 && events.length === 0;

  return (
    <View
      style={{
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: isToday ? palette.accent : palette.cardBorder,
        backgroundColor: palette.card,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: space.sm,
          paddingHorizontal: space.lg,
          paddingVertical: space.md,
          backgroundColor: isToday ? palette.accentSubtle : palette.surface,
        }}
      >
        <Text
          style={{
            fontSize: 13,
            fontWeight: "700",
            letterSpacing: 0.4,
            textTransform: "uppercase",
            color: isToday ? palette.accent : palette.muted,
          }}
        >
          {formatDate(date, { weekday: "long" })}
        </Text>
        <Text style={{ fontSize: 13, color: isToday ? palette.accent : palette.faint }}>
          {formatDate(date, { day: "numeric", month: "short" })}
        </Text>
        <View style={{ flex: 1 }} />
        {sessions.length > 0 ? (
          <Text style={{ fontSize: 12, fontWeight: "700", color: palette.muted }}>
            {sessions.length}
          </Text>
        ) : null}
      </View>

      {holidays.length > 0 ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: space.sm,
            paddingHorizontal: space.lg,
            paddingVertical: space.sm,
            backgroundColor: palette.warningSubtle,
          }}
        >
          <Icon name="calendar" size={14} color={palette.warning} />
          <Text style={{ fontSize: 12, color: palette.warning, flex: 1 }}>
            {holidays.join(" · ")}
          </Text>
        </View>
      ) : null}

      {empty ? (
        <Text
          style={{
            paddingHorizontal: space.lg,
            paddingVertical: space.md,
            fontSize: 13,
            color: palette.faint,
          }}
        >
          {tm("noLessonsThisDay")}
        </Text>
      ) : (
        <View style={{ paddingVertical: space.xs }}>
          {sessions.map((s) => (
            <SessionRow
              key={s.id}
              session={s}
              onPress={onSessionPress ? () => onSessionPress(s) : undefined}
            />
          ))}
          {events.map((e) => (
            <View
              key={e.id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: space.md,
                paddingHorizontal: space.lg,
                paddingVertical: space.sm,
              }}
            >
              <Text
                style={{
                  width: 46,
                  fontSize: 13,
                  ...TIME_TEXT,
                  color: palette.muted,
                }}
              >
                {shortTime(e.startTime) ?? "—"}
              </Text>
              <Icon name="announcements" size={15} color={palette.info} />
              <Text style={{ flex: 1, fontSize: 15, color: palette.foreground }}>
                {e.title}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function SessionRow({
  session,
  onPress,
}: {
  session: CalendarSession;
  onPress?: () => void;
}) {
  const palette = usePalette();
  const color = sessionColor(session, palette);
  const start = shortTime(session.startTime);
  const end = shortTime(session.endTime);

  const content = (
    <>
      <View style={{ width: 46 }}>
        <Text
          style={{
            fontSize: 13,
            fontWeight: "700",
            ...TIME_TEXT,
            color: session.isCancelled ? palette.faint : palette.foreground,
          }}
        >
          {start ?? "—"}
        </Text>
        {end ? (
          <Text
            style={{ fontSize: 12, ...TIME_TEXT, color: palette.faint }}
          >
            {end}
          </Text>
        ) : null}
      </View>

      {/* The colour bar carries the group identity at a glance down the week. */}
      <View
        style={{
          width: 3,
          alignSelf: "stretch",
          minHeight: 26,
          borderRadius: 2,
          backgroundColor: session.isCancelled ? palette.cardBorder : color,
        }}
      />

      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: "600",
            color: session.isCancelled ? palette.faint : palette.foreground,
            textDecorationLine: session.isCancelled ? "line-through" : "none",
          }}
        >
          {session.title ?? tm("lesson")}
        </Text>
        {session.room || session.notes ? (
          <Text style={{ fontSize: 12, color: palette.muted, marginTop: 1 }}>
            {[session.room, session.notes].filter(Boolean).join(" · ")}
          </Text>
        ) : null}
      </View>

      {session.isCancelled ? (
        <Text style={{ fontSize: 12, fontWeight: "700", color: palette.danger }}>
          {tm("cancelled")}
        </Text>
      ) : null}
    </>
  );

  // Teachers can tap a lesson to cancel or restore it; everyone else reads.
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${session.title ?? tm("lesson")} · ${tm("cancelLesson")}`}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: space.md,
          paddingHorizontal: space.lg,
          paddingVertical: space.sm,
          opacity: pressed ? 0.5 : 1,
        })}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        paddingHorizontal: space.lg,
        paddingVertical: space.sm,
      }}
    >
      {content}
    </View>
  );
}
