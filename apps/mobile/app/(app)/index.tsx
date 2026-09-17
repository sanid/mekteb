import { useCallback, useEffect } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

import { api } from "@/lib/api";
import { useResource } from "@/lib/resource";
import { refreshWidgets } from "@/lib/widget";
import { hasPlugin } from "@/lib/session";
import { useSession } from "@/lib/session-context";
import type {
  NotificationPage,
  ParentChild,
  PrayerTimes,
  StudentHomework,
  StudentWrittenTest,
  TeacherGroup,
} from "@/lib/types";
import { roleLabel, tm } from "@/lib/i18n";
import {
  Avatar,
  Card,
  EmptyState,
  ErrorNotice,
  FirstLoad,
  IconButton,
  IconTitle,
  ProgressRing,
  SectionTitle,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { radius, space, usePalette } from "@/theme";

type Hifz = {
  pagesMemorized: number;
  pagesTotal: number;
  juzMemorized: number;
  percentComplete: number;
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return tm("goodMorning");
  if (h < 18) return tm("goodAfternoon");
  return tm("goodEvening");
}

/** Days until due — negative means overdue. */
function daysUntil(dateStr: string): number {
  const due = new Date(dateStr);
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

export default function HomeScreen() {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useSession();

  const isTeacher = !!session?.roles.includes("teacher");
  const isStudent = !!session?.roles.includes("student");
  const isParent = !!session?.roles.includes("parent");
  const isExaminer = !!session?.roles.includes("examiner");
  const isAdmin = !!session?.roles.includes("mosque_admin");

  const wantsHifz = isStudent && hasPlugin(session, "quran_hifz");
  const wantsInbox = hasPlugin(session, "notifications");
  const wantsWritten = isStudent && hasPlugin(session, "exam_system");

  /**
   * One key for the whole dashboard: the requests are always shown together,
   * so caching them separately would let the screen render a half-updated mix.
   */
  const { data, error, refreshing, refresh } = useResource<{
    groups: TeacherGroup[];
    homework: StudentHomework[];
    hifz: Hifz | null;
    children: ParentChild[];
    unread: number;
    writtenTests: StudentWrittenTest[];
  }>(
    `home:${isTeacher ? "t" : ""}${isStudent ? "s" : ""}${isParent ? "p" : ""}${wantsHifz ? "h" : ""}${wantsInbox ? "n" : ""}${wantsWritten ? "w" : ""}`,
    useCallback(
      async () => {
        const [groups, homework, hifz, children, inbox, writtenTests] =
          await Promise.all([
            isTeacher ? api<TeacherGroup[]>("/teacher/groups") : Promise.resolve([]),
            isStudent ? api<StudentHomework[]>("/student/homework") : Promise.resolve([]),
            // Only if the mosque actually has the plugin on (AGENTS.md §0.2).
            wantsHifz ? api<Hifz>("/student/hifz") : Promise.resolve(null),
            isParent ? api<ParentChild[]>("/parent/children") : Promise.resolve([]),
            // Only the count is shown, so ask for unread rows and cap the page —
            // "50+" and "312" mean the same thing to someone glancing at a card.
            wantsInbox
              ? api<NotificationPage>("/notifications", {
                  query: { unreadOnly: "true", limit: 50 },
                })
              : Promise.resolve(null),
            wantsWritten
              ? api<StudentWrittenTest[]>("/student/written-tests")
              : Promise.resolve([]),
          ]);
        return {
          groups,
          homework,
          hifz,
          children,
          unread: inbox?.notifications.length ?? 0,
          writtenTests,
        };
      },
      [isTeacher, isStudent, isParent, wantsHifz, wantsInbox, wantsWritten],
    ),
    { fallbackError: tm("loadFailed") },
  );

  /**
   * Today's prayer times — independent of the dashboard bundle so a slow
   * AlAdhan answer never blocks the home cards. Renders nothing until the
   * mosque sets a location (the endpoint returns `prayerTimes: null`).
   */
  const prayer = useResource<{ prayerTimes: PrayerTimes | null } | null>(
    hasPlugin(session, "prayer_times") ? "prayer-times" : null,
    useCallback(() => api<{ prayerTimes: PrayerTimes | null }>("/prayer-times"), []),
    { fallbackError: null as never },
  );

  /**
   * Keep the home-screen widgets fed. This runs whenever the dashboard has
   * data — the moment the app has just proven it can reach the API — rather
   * than on a timer: a widget cannot fetch anything itself, so the app opening
   * *is* the refresh (AGENTS.md §8).
   */
  const hasData = !!data;
  useEffect(() => {
    if (hasData) void refreshWidgets();
  }, [hasData]);

  if (!data) return <FirstLoad error={error} />;

  const { groups, homework, hifz, children, unread, writtenTests } = data;

  const pendingWritten = writtenTests.find((t) => t.status === "pending");

  const todo = homework.filter((h) => !h.acknowledgedAt);
  const next = todo
    .filter((h) => h.dueDate)
    .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1))[0];
  const totalStudents = groups.reduce((n, g) => n + g.student_count, 0);
  const name = session?.profile?.display_name ?? session?.profile?.full_name ?? "";

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + space.lg,
          paddingHorizontal: space.xl,
          paddingBottom: insets.bottom + space.xxl,
          gap: space.lg,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={palette.muted} />
        }
      >
        {/*
          Greeting, then the two things that are *new* since last time.
          Announcements and notifications sat as cards halfway down the
          dashboard, below the fold on a small phone — which is the wrong place
          for the one part of the screen that changes. The role chip moved
          under the name to make room; it is a label, not an action.
        */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
          <Avatar name={name || "?"} size={48} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, color: palette.muted }}>{greeting()},</Text>
            <Text
              style={{ fontSize: 24, fontWeight: "700", color: palette.foreground }}
              numberOfLines={1}
            >
              {name.split(" ")[0]}
            </Text>
            {session?.roles[0] ? (
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: palette.faint,
                  marginTop: 1,
                }}
              >
                {roleLabel(session.roles[0])}
              </Text>
            ) : null}
          </View>

          {hasPlugin(session, "announcements") ? (
            <IconButton
              icon="announcements"
              accessibilityLabel={tm("announcements")}
              onPress={() => router.push("/(app)/inbox?tab=announcements")}
            />
          ) : null}
          {wantsInbox ? (
            <IconButton
              icon="notifications"
              accessibilityLabel={tm("notifications")}
              badge={unread}
              onPress={() => router.push("/(app)/inbox")}
            />
          ) : null}
        </View>

        {error ? <ErrorNotice message={error} /> : null}

        {/* ── Prayer times ──────────────────────────────────────────── */}
        {prayer.data?.prayerTimes ? (
          <Card>
            <View style={{ gap: space.md }}>
              <IconTitle icon="mosque">{tm("prayerTimes")}</IconTitle>
              <View style={{ gap: space.xs }}>
                {([
                  ["fajr", prayer.data.prayerTimes.fajr],
                  ["dhuhr", prayer.data.prayerTimes.dhuhr],
                  ["asr", prayer.data.prayerTimes.asr],
                  ["maghrib", prayer.data.prayerTimes.maghrib],
                  ["isha", prayer.data.prayerTimes.isha],
                ] as const).map(([key, value]) => (
                  <View
                    key={key}
                    style={{ flexDirection: "row", justifyContent: "space-between" }}
                  >
                    <Text style={{ color: palette.muted, fontSize: 13 }}>
                      {tm(`prayer_${key}`)}
                    </Text>
                    <Text style={{ color: palette.foreground, fontSize: 13, fontWeight: "600" }}>
                      {value}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </Card>
        ) : null}

        {/* ── Student ───────────────────────────────────────────────── */}
        {isStudent ? (
          <Animated.View entering={FadeInDown.duration(240)} style={{ gap: space.md }}>
            {/* A pending written test is the one thing that must not be
                missed: the examiner is waiting on it, and unlike homework it
                never surfaces again once graded. It gets a banner of its
                own above everything else. */}
            {pendingWritten ? (
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  router.push(`/(app)/written-test/${pendingWritten.token}`)
                }
                style={({ pressed }) => ({
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: palette.accent,
                  backgroundColor: palette.accentSubtle,
                  padding: space.lg,
                  gap: 4,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
                  <Icon name="lessonPage" size={18} color={palette.accent} />
                  <Text
                    style={{
                      color: palette.accent,
                      fontWeight: "700",
                      fontSize: 13,
                      letterSpacing: 0.6,
                      textTransform: "uppercase",
                      flex: 1,
                    }}
                  >
                    {tm("newWrittenTest")}
                  </Text>
                  <Icon name="chevron" size={16} color={palette.accent} />
                </View>
                <Text
                  style={{
                    color: palette.foreground,
                    fontWeight: "700",
                    fontSize: 18,
                  }}
                >
                  {pendingWritten.title}
                </Text>
                <Text style={{ color: palette.muted, fontSize: 13 }}>
                  {tm("newWrittenTestBody")}
                </Text>
              </Pressable>
            ) : null}

            <Card onPress={() => router.push("/(app)/homework")}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: space.lg }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, color: palette.faint, fontWeight: "700", letterSpacing: 0.6 }}>
                    {tm("homework").toUpperCase()}
                  </Text>
                  <Text
                    style={{
                      fontSize: 28,
                      fontWeight: "700",
                      color: todo.length ? palette.foreground : palette.accent,
                      marginTop: 2,
                    }}
                  >
                    {todo.length === 0 ? tm("allDone") : tm("toDo", { count: todo.length })}
                  </Text>
                  {next ? (
                    <Text style={{ color: palette.muted, marginTop: 4, fontSize: 13 }}>
                      {tm("next")}: {next.title}
                    </Text>
                  ) : null}
                </View>
                {next?.dueDate ? (
                  <DueBadge days={daysUntil(next.dueDate)} />
                ) : null}
              </View>
            </Card>

            {hifz ? (
              <Card onPress={() => router.push("/(app)/quran")}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: space.lg }}>
                  <ProgressRing value={hifz.percentComplete / 100} size={84} stroke={8}>
                    <Text style={{ fontSize: 18, fontWeight: "700", color: palette.foreground }}>
                      {hifz.percentComplete}%
                    </Text>
                  </ProgressRing>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, color: palette.faint, fontWeight: "700", letterSpacing: 0.6 }}>
                    {tm("hifz").toUpperCase()}
                    </Text>
                    <Text
                      style={{ fontSize: 18, fontWeight: "700", color: palette.foreground, marginTop: 2 }}
                    >
                      {hifz.juzMemorized} {tm("juz")}
                    </Text>
                    <Text style={{ color: palette.muted, fontSize: 13, marginTop: 2 }}>
                      {tm("pagesOf", { done: hifz.pagesMemorized, total: hifz.pagesTotal })}
                    </Text>
                  </View>
                </View>
              </Card>
            ) : null}

            {/*
              Exams get a card rather than a tab: five tabs is already the
              bar's ceiling, and a student looks at exams a few times a term,
              not daily.
            */}
            {hasPlugin(session, "exam_system") ? (
              <Card onPress={() => router.push("/(app)/exams")}>
                <IconTitle icon="exams">{tm("exams")}</IconTitle>
                <Text style={{ color: palette.muted, fontSize: 13, marginTop: 4 }}>
                  {tm("viewExams")}
                </Text>
              </Card>
            ) : null}

            {hasPlugin(session, "lesson_library") ? (
              <Card onPress={() => router.push("/(app)/lessons")}>
                <IconTitle icon="lessons">{tm("lessons")}</IconTitle>
                <Text style={{ color: palette.muted, fontSize: 13, marginTop: 4 }}>
                  {tm("browseLessons")}
                </Text>
              </Card>
            ) : null}

            {/* The web student home lists enrolled groups as cards; here one
                card opens the list. Upcoming lessons and weekly summaries live
                inside each group. */}
            <Card onPress={() => router.push("/(app)/my-groups")}>
              <IconTitle icon="groups">{tm("myGroups")}</IconTitle>
              <Text style={{ color: palette.muted, fontSize: 13, marginTop: 4 }}>
                {tm("viewMyGroups")}
              </Text>
            </Card>

            {/* Written tests arrive on paper or by email; the code on them
                opens the test in the app. */}
            {hasPlugin(session, "exam_system") ? (
              <Card onPress={() => router.push("/(app)/written-test")}>
                <IconTitle icon="lessonPage">{tm("writtenTest")}</IconTitle>
                <Text style={{ color: palette.muted, fontSize: 13, marginTop: 4 }}>
                  {tm("writtenTestCodeHint")}
                </Text>
              </Card>
            ) : null}

            {/* Check in for today's session with the teacher's code. */}
            {hasPlugin(session, "student_checkin") ? (
              <Card onPress={() => router.push("/(app)/checkin")}>
                <IconTitle icon="attendance">{tm("checkin")}</IconTitle>
                <Text style={{ color: palette.muted, fontSize: 13, marginTop: 4 }}>
                  {tm("checkinCodeHint")}
                </Text>
              </Card>
            ) : null}

            {/* The school-year report card, same numbers as the web report. */}
            {hasPlugin(session, "annual_report") ? (
              <Card onPress={() => router.push("/(app)/report-card")}>
                <IconTitle icon="notes">{tm("reportCard")}</IconTitle>
                <Text style={{ color: palette.muted, fontSize: 13, marginTop: 4 }}>
                  {tm("reportCardHint")}
                </Text>
              </Card>
            ) : null}

            {/* Progress notes + weekly summaries — the mobile half of the
                web student portal's notes views. */}
            <Card onPress={() => router.push("/(app)/notes")}>
              <IconTitle icon="notes">{tm("myNotes")}</IconTitle>
              <Text style={{ color: palette.muted, fontSize: 13, marginTop: 4 }}>
                {tm("viewNotes")}
              </Text>
            </Card>
          </Animated.View>
        ) : null}

        {/* ── Parent ────────────────────────────────────────────────── */}
        {isParent ? (
          <View style={{ gap: space.md }}>
            <SectionTitle>{tm("myChildren")}</SectionTitle>
            {children.length === 0 ? (
              <EmptyState icon="children">{tm("noChildren")}</EmptyState>
            ) : (
              children.map((child, i) => (
                <Animated.View
                  key={child.id}
                  entering={FadeInDown.delay(i * 40).duration(220)}
                >
                  <Card onPress={() => router.push(`/(app)/children/${child.id}`)}>
                    <View
                      style={{ flexDirection: "row", alignItems: "center", gap: space.md }}
                    >
                      <Avatar name={child.fullName} size={44} />
                      <Text
                        style={{
                          flex: 1,
                          fontSize: 16,
                          fontWeight: "700",
                          color: palette.foreground,
                        }}
                      >
                        {child.fullName}
                      </Text>
                      <Icon name="chevron" size={18} color={palette.faint} />
                    </View>
                  </Card>
                </Animated.View>
              ))
            )}

            {/* Parents can check children in and read their report card too. */}
            {hasPlugin(session, "student_checkin") ? (
              <Card onPress={() => router.push("/(app)/checkin")}>
                <IconTitle icon="attendance">{tm("checkin")}</IconTitle>
                <Text style={{ color: palette.muted, fontSize: 13, marginTop: 4 }}>
                  {tm("checkinCodeHint")}
                </Text>
              </Card>
            ) : null}
            {hasPlugin(session, "annual_report") ? (
              <Card onPress={() => router.push("/(app)/report-card")}>
                <IconTitle icon="notes">{tm("reportCard")}</IconTitle>
                <Text style={{ color: palette.muted, fontSize: 13, marginTop: 4 }}>
                  {tm("reportCardHint")}
                </Text>
              </Card>
            ) : null}
          </View>
        ) : null}

        {/* ── Teacher ───────────────────────────────────────────────── */}
        {isTeacher ? (
          <View style={{ gap: space.md }}>
            <View style={{ flexDirection: "row", gap: space.md }}>
              <Stat label={tm("groups")} value={groups.length} />
              <Stat label={tm("students")} value={totalStudents} />
            </View>

            <SectionTitle>{tm("myGroups")}</SectionTitle>
            {groups.length === 0 ? (
              <EmptyState icon="groups">{tm("noGroups")}</EmptyState>
            ) : (
              groups.map((g, i) => (
                <Animated.View key={g.id} entering={FadeInDown.delay(i * 40).duration(220)}>
                  <Card onPress={() => router.push(`/(app)/groups/${g.id}`)}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: radius.md,
                          backgroundColor: palette.accentSubtle,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Icon name="groups" size={20} color={palette.accent} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{ fontSize: 16, fontWeight: "700", color: palette.foreground }}
                        >
                          {g.name}
                        </Text>
                        <Text style={{ color: palette.muted, fontSize: 13, marginTop: 2 }}>
                          {tm("students")}: {g.student_count}
                        </Text>
                      </View>
                      <Icon name="chevron" size={18} color={palette.faint} />
                    </View>
                  </Card>
                </Animated.View>
              ))
            )}
          </View>
        ) : null}

        {/* One card for every role — `/calendar` scopes itself per reader.
            Gated on the `calendar` plugin because the web portals are: a
            mosque that switches the feature off must not still have it on the
            phone, which is the mismatch the hifz widget shipped with. */}
        {hasPlugin(session, "calendar") ? (
          <Card onPress={() => router.push("/(app)/calendar")}>
            <IconTitle
              icon="calendar"
              right={<Icon name="chevron" size={18} color={palette.faint} />}
            >
              {tm("calendar")}
            </IconTitle>
            <Text style={{ color: palette.muted, fontSize: 13, marginTop: 4 }}>
              {tm("calendarSubtitle")}
            </Text>
          </Card>
        ) : null}

        {/* Attendance lost its tab to messaging, so it lives here now — a
            student checks their record occasionally, not daily. */}
        {isStudent ? (
          <Card onPress={() => router.push("/(app)/attendance")}>
            <IconTitle
              icon="attendance"
              right={<Icon name="chevron" size={18} color={palette.faint} />}
            >
              {tm("attendance")}
            </IconTitle>
            <Text style={{ color: palette.muted, fontSize: 13, marginTop: 4 }}>
              {tm("attendanceSubtitle")}
            </Text>
          </Card>
        ) : null}

        {/* ── Examiner / admin ──────────────────────────────────────────── */}
        {isExaminer ? (
          <Card onPress={() => router.push("/(app)/examiner")}>
            <IconTitle icon="exams">{tm("examiner")}</IconTitle>
            <Text style={{ color: palette.muted, fontSize: 13, marginTop: 4 }}>
              {tm("viewExams")}
            </Text>
          </Card>
        ) : null}

        {isAdmin ? (
          <Card onPress={() => router.push("/(app)/admin")}>
            <IconTitle icon="students">{tm("adminDirectory")}</IconTitle>
            <Text style={{ color: palette.muted, fontSize: 13, marginTop: 4 }}>
              {tm("viewAdminDirectory")}
            </Text>
          </Card>
        ) : null}

        {/* Sign-out moved into Settings: it sat one mis-tap below the last
            card, and everything else it belongs with (profile, language,
            password, account deletion) lives there. */}
        <Card onPress={() => router.push("/(app)/settings")}>
          <IconTitle
            icon="settings"
            right={<Icon name="chevron" size={18} color={palette.faint} />}
          >
            {tm("settings")}
          </IconTitle>
        </Card>

      </ScrollView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  const palette = usePalette();
  return (
    <View
      style={{
        flex: 1,
        padding: space.lg,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: palette.cardBorder,
        backgroundColor: palette.card,
      }}
    >
      <Text style={{ fontSize: 28, fontWeight: "700", color: palette.foreground }}>{value}</Text>
      <Text style={{ fontSize: 12, color: palette.muted, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

/** Urgency reads by colour before it reads as text. */
function DueBadge({ days }: { days: number }) {
  const palette = usePalette();
  const overdue = days < 0;
  const soon = days <= 1;
  const fg = overdue ? palette.danger : soon ? palette.warning : palette.muted;
  const bg = overdue ? palette.dangerSubtle : soon ? palette.warningSubtle : palette.surface;
  const label = overdue
    ? tm("daysLate", { days: Math.abs(days) })
    : days === 0
      ? tm("today")
      : days === 1
        ? tm("tomorrow")
        : tm("inDays", { days });

  return (
    <View
      style={{
        paddingHorizontal: space.md,
        paddingVertical: space.sm,
        borderRadius: radius.md,
        backgroundColor: bg,
        alignItems: "center",
      }}
    >
      <Text style={{ color: fg, fontWeight: "700", fontSize: 13 }}>{label}</Text>
    </View>
  );
}
