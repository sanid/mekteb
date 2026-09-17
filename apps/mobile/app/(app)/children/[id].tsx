import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { api, ApiError } from "@/lib/api";
import { invalidate, useResource } from "@/lib/resource";
import { formatDate, tm } from "@/lib/i18n";
import type { AttendanceStatus, ParentChildDetail } from "@/lib/types";
import {
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorNotice,
  FirstLoad,
  ProgressBar,
  SectionTitle,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { ExamList, statusLabel as examStatusLabel } from "@/components/exam-list";
import { attendanceColors, radius, space, usePalette } from "@/theme";

/**
 * One child, as their parent sees them: groups, homework they can acknowledge
 * on the child's behalf, recent attendance, exams they can answer for, and the
 * teacher's notes.
 *
 * Only notes a teacher marked visible to parents ever arrive here — the API
 * filters on `visible_to_parents`, so there is nothing to hide client-side.
 */
export default function ChildDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const palette = usePalette();
  const colors = attendanceColors(palette);
  const insets = useSafeAreaInsets();

  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data,
    error: loadError,
    refreshing,
    refresh,
    set,
  } = useResource<ParentChildDetail>(
    id ? `parent/children/${id}` : null,
    useCallback(() => api<ParentChildDetail>(`/parent/children/${id}`), [id]),
    { fallbackError: tm("childLoadFailed") },
  );

  const error = actionError ?? loadError;

  /**
   * A parent acknowledging homework is the same act as the student doing it —
   * the endpoint upserts on `(homework_id, student_profile_id)`, so whoever
   * gets there first wins and a second acknowledgement is a no-op.
   */
  const acknowledge = async (homeworkId: string) => {
    if (!id || busyId) return;
    setBusyId(homeworkId);
    setActionError(null);
    const previous = data;
    set((current) =>
      current
        ? {
            ...current,
            homework: current.homework.map((h) =>
              h.id === homeworkId
                ? { ...h, acknowledgedAt: new Date().toISOString() }
                : h,
            ),
          }
        : current!,
    );
    try {
      await api(`/parent/homework/${homeworkId}/acknowledge`, {
        method: "POST",
        body: { student_profile_id: id },
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // The child's own homework screen, if they also use the app.
      invalidate("student/homework");
    } catch (e) {
      if (previous) set(previous);
      setActionError(e instanceof ApiError ? e.message : tm("ackFailed"));
    } finally {
      setBusyId(null);
    }
  };

  if (!data) {
    return (
      <>
        <Stack.Screen options={{ title: tm("children") }} />
        <FirstLoad error={error} />
      </>
    );
  }

  const { student, groups, homework, attendance, notes } = data;
  const todo = homework.filter((h) => !h.acknowledgedAt);

  // Same rule as the student's own view: late counts as attended, excused
  // leaves the denominator entirely.
  const counted = attendance.filter((a) => a.status !== "excused").length;
  const attended = attendance.filter(
    (a) => a.status === "present" || a.status === "late",
  ).length;
  const rate = counted === 0 ? 0 : attended / counted;

  return (
    <>
      <Stack.Screen options={{ title: student.fullName }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: palette.background }}
        contentContainerStyle={{
          padding: space.xl,
          gap: space.lg,
          paddingBottom: insets.bottom + space.xxl,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={palette.muted} />
        }
      >
        {error ? <ErrorNotice message={error} /> : null}

        {groups.length > 0 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {groups.map((g) => (
              <Chip key={g.enrollmentId} label={g.groupName} />
            ))}
          </View>
        ) : null}

        {/* Homework first: it is the only thing here a parent can act on. */}
        <View style={{ gap: space.md }}>
          <SectionTitle>
            {todo.length === 0 ? tm("allCaughtUp") : tm("toDo", { count: todo.length })}
          </SectionTitle>

          {homework.length === 0 ? (
            <EmptyState icon="homework">{tm("noHomeworkYet")}</EmptyState>
          ) : (
            homework.map((h) => (
              <Card key={h.id}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: palette.foreground }}>
                  {h.title}
                </Text>
                {h.body ? (
                  <Text style={{ color: palette.muted, fontSize: 13, marginTop: 4 }}>
                    {h.body}
                  </Text>
                ) : null}
                {h.dueDate ? (
                  <Text style={{ color: palette.faint, fontSize: 12, marginTop: 6 }}>
                    {tm("due")}: {formatDate(h.dueDate, { day: "numeric", month: "long" })}
                  </Text>
                ) : null}

                {h.acknowledgedAt ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      marginTop: 10,
                    }}
                  >
                    <Icon name="done" size={15} color={palette.accent} />
                    <Text
                      style={{ color: palette.accent, fontSize: 13, fontWeight: "600" }}
                    >
                      {tm("done")}
                    </Text>
                  </View>
                ) : (
                  <Button
                    label={tm("markAsDone")}
                    variant="outline"
                    busy={busyId === h.id}
                    onPress={() => acknowledge(h.id)}
                    style={{ marginTop: 12 }}
                  />
                )}
              </Card>
            ))
          )}
        </View>

        <View style={{ gap: space.md }}>
          <SectionTitle>{tm("attendance")}</SectionTitle>
          {attendance.length === 0 ? (
            <EmptyState icon="attendance">{tm("noAttendance")}</EmptyState>
          ) : (
            <Card>
              <View
                style={{ flexDirection: "row", alignItems: "center", marginBottom: space.sm }}
              >
                <Text style={{ color: palette.muted, fontSize: 13, flex: 1 }}>
                  {tm("attendanceRate")}
                </Text>
                <Text style={{ fontWeight: "700", color: palette.foreground }}>
                  {Math.round(rate * 100)}%
                </Text>
              </View>
              <ProgressBar
                value={rate}
                tint={rate >= 0.8 ? palette.accent : rate >= 0.5 ? palette.warning : palette.danger}
              />

              <View style={{ gap: space.sm, marginTop: space.md }}>
                {attendance.slice(0, 8).map((a) => {
                  const c = colors[a.status as AttendanceStatus] ?? {
                    fg: palette.muted,
                    bg: palette.surface,
                  };
                  return (
                    <View
                      key={a.sessionId}
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <Text style={{ color: palette.foreground, fontSize: 13, flex: 1 }}>
                        {formatDate(a.sessionDate, {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
                      </Text>
                      <View
                        style={{
                          paddingHorizontal: space.sm + 2,
                          paddingVertical: 3,
                          borderRadius: radius.pill,
                          backgroundColor: c.bg,
                        }}
                      >
                        <Text style={{ color: c.fg, fontWeight: "700", fontSize: 12 }}>
                          {tm(a.status)}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </Card>
          )}
        </View>

        {/* Exams sit above the notes: a proposed date needs an answer, a note
            is only there to be read. */}
        <View style={{ gap: space.md }}>
          <ExamList
            sessions={data.exams ?? []}
            // The child's own exam screen reads the same rows from a different
            // endpoint, so both caches have to go.
            invalidateKeys={[`parent/children/${id}`, "student/exams"]}
            onChanged={refresh}
          />
        </View>

        <View style={{ gap: space.md }}>
          <SectionTitle>{tm("writtenTests")}</SectionTitle>
          {!data.writtenTests || data.writtenTests.length === 0 ? (
            <EmptyState icon="lessonPage">{tm("noWrittenTests")}</EmptyState>
          ) : (
            data.writtenTests.map((w) => {
              const isPending = w.status === "pending";
              const isGraded = w.status === "graded";
              return (
                <Card
                  key={w.id}
                  style={{
                    borderColor: isPending ? palette.accent : palette.cardBorder,
                    borderWidth: isPending ? 1.5 : 1,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
                    <Text
                      style={{
                        flex: 1,
                        color: palette.foreground,
                        fontWeight: "700",
                        fontSize: 15,
                      }}
                    >
                      {w.title}
                    </Text>
                    <Chip
                      label={
                        isPending
                          ? tm("writtenTestPending")
                          : w.status === "submitted"
                            ? tm("writtenTestSubmitted")
                            : tm("writtenTestGraded")
                      }
                      fg={isPending ? palette.warning : isGraded ? palette.accent : palette.info}
                      bg={isPending ? palette.warningSubtle : isGraded ? palette.accentSubtle : palette.infoSubtle}
                    />
                  </View>

                  {isGraded && w.overallResult ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.sm }}>
                      <Text style={{ color: palette.muted, fontSize: 13, fontWeight: "600" }}>
                        {tm("result")}
                      </Text>
                      <Chip
                        label={w.overallResult === "passed" ? tm("examPassed") : tm("examFailed")}
                        fg={w.overallResult === "passed" ? palette.accent : palette.danger}
                        bg={w.overallResult === "passed" ? palette.accentSubtle : palette.dangerSubtle}
                      />
                    </View>
                  ) : null}

                  {/* The oral exam this written test belongs to — its status
                      is what "exam status" means for a written part. */}
                  {w.exam ? (
                    <Text style={{ color: palette.muted, fontSize: 13, marginTop: space.sm }}>
                      {tm("examStatus")}: {w.exam.status ? examStatusLabel(w.exam.status) : tm("examDateTbd")}
                      {w.exam.examDate
                        ? ` · ${formatDate(w.exam.examDate, { day: "numeric", month: "short" })}`
                        : ""}
                    </Text>
                  ) : null}

                  {isPending ? (
                    <Text style={{ color: palette.faint, fontSize: 12, marginTop: space.sm }}>
                      {tm("writtenTestAwaitingChild")}
                    </Text>
                  ) : null}
                </Card>
              );
            })
          )}
        </View>

        <View style={{ gap: space.md }}>
          <SectionTitle>{tm("teacherNotes")}</SectionTitle>
          {notes.length === 0 ? (
            <EmptyState icon="notes">{tm("noParentNotes")}</EmptyState>
          ) : (
            notes.map((n) => (
              <Card key={n.id}>
                <Text style={{ color: palette.foreground, fontSize: 14, lineHeight: 21 }}>
                  {n.body}
                </Text>
                <Text style={{ color: palette.faint, fontSize: 12, marginTop: space.sm }}>
                  {formatDate(n.createdAt, { day: "numeric", month: "long" })}
                </Text>
              </Card>
            ))
          )}
        </View>
      </ScrollView>
    </>
  );
}
