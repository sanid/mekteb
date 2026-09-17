import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, Layout } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { api, ApiError } from "@/lib/api";
import { invalidate, peek, put } from "@/lib/resource";
import { formatDate, tm } from "@/lib/i18n";
import {
  ATTENDANCE_STATUSES,
  type AttendanceSession,
  type AttendanceStatus,
  type GroupDetail,
} from "@/lib/types";
import {
  Avatar,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorNotice,
  Field,
  Loading,
  ProgressBar,
  SectionTitle,
} from "@/components/ui";
import { attendanceColors, radius, space, usePalette } from "@/theme";

/** Local date in YYYY-MM-DD — never `toISOString()`, which shifts across UTC. */
function todayLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Built lazily: German pills are much wider, so the labels are deliberately
 *  short in the catalogue (AGENTS.md §3). */
const statusLabel = (status: AttendanceStatus): string => tm(status);

type WeeklyNoteRow = {
  id: string;
  week_start: string;
  body: string;
  is_published: boolean;
};

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const palette = usePalette();
  const statusColor = attendanceColors(palette);
  const insets = useSafeAreaInsets();

  // Seeded from cache so returning to a group shows the roster at once and
  // refetches behind it, instead of a spinner every time.
  const [group, setGroup] = useState<GroupDetail | null>(() => peek<GroupDetail>(`groups/${id}`));
  const [sessions, setSessions] = useState<AttendanceSession[] | null>(() =>
    peek<AttendanceSession[]>(`groups/${id}/attendance`),
  );
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  /**
   * Which day's register is on screen. Defaults to today; tapping a recent
   * session below loads that date's marks in so past registers stay
   * correctable — a child who was marked present then had to leave early
   * should not stay marked present forever.
   */
  const today = todayLocal();
  const [activeDate, setActiveDate] = useState(today);

  // Weekly summary: the current week's note is edited inline, past notes are
  // listed underneath and can be tapped back into the editor.
  const [weekly, setWeekly] = useState<WeeklyNoteRow[] | null>(null);
  const [weeklyBody, setWeeklyBody] = useState("");
  const [savingWeekly, setSavingWeekly] = useState(false);
  const [weeklySaved, setWeeklySaved] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const [g, s] = await Promise.all([
        api<GroupDetail>(`/teacher/groups/${id}`),
        api<AttendanceSession[]>(`/groups/${id}/attendance`),
      ]);
      setGroup(g);
      setSessions(s);
      put(`groups/${id}`, g);
      put(`groups/${id}/attendance`, s);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : tm("groupLoadFailed"));
    }
  }, [id]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  // Load marks for the date that is active *when data arrives* — today by
  // default, or the tapped session afterwards (selectSession sets the date).
  useEffect(() => {
    void Promise.resolve().then(() => {
      if (!sessions) return;
      const existing = sessions.find((x) => x.session_date === activeDate);
      setMarks(
        existing
          ? Object.fromEntries(
              existing.attendance_records.map((r) => [r.student_profile_id, r.status]),
            )
          : {},
      );
    });
  }, [sessions, activeDate]);

  // Weekly summary is a teacher-only companion to the roster; load it once.
  const loadWeekly = useCallback(async () => {
    if (!id) return;
    try {
      const rows = await api<WeeklyNoteRow[]>("/teacher/weekly-notes", {
        query: { group_id: id },
      });
      setWeekly(rows);
      const current = rows.find((r) => r.week_start === today);
      if (current) setWeeklyBody(current.body);
    } catch {
      // The weekly summary is optional; a failure must not block the register.
      setWeekly([]);
    }
  }, [id, today]);

  useEffect(() => {
    void Promise.resolve().then(loadWeekly);
  }, [loadWeekly]);

  const markedCount = useMemo(
    () => (group ? group.enrollments.filter((e) => marks[e.studentProfileId]).length : 0),
    [group, marks],
  );

  const setStatus = (studentProfileId: string, status: AttendanceStatus) => {
    void Haptics.selectionAsync();
    setSaved(false);
    setMarks((m) => ({ ...m, [studentProfileId]: status }));
  };

  /**
   * Most of a class is present most days, so marking everyone present and
   * correcting the exceptions is far fewer taps than marking each student.
   */
  const markAllPresent = () => {
    if (!group) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaved(false);
    setMarks(
      Object.fromEntries(
        group.enrollments.map((e) => [e.studentProfileId, "present" as AttendanceStatus]),
      ),
    );
  };

  /** Tap a recent session to edit that day's register instead of today's. */
  const selectSession = (s: AttendanceSession) => {
    void Haptics.selectionAsync();
    setSaved(false);
    setError(null);
    setActiveDate(s.session_date);
    setMarks(
      Object.fromEntries(
        s.attendance_records.map((r) => [r.student_profile_id, r.status]),
      ),
    );
  };

  const save = async () => {
    if (!group || saving) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await api(`/groups/${group.id}/attendance`, {
        method: "POST",
        body: {
          session_date: activeDate,
          records: group.enrollments
            .filter((e) => marks[e.studentProfileId])
            .map((e) => ({
              student_profile_id: e.studentProfileId,
              status: marks[e.studentProfileId],
            })),
        },
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSaved(true);
      // The register refetch runs behind the "Saved" state — the teacher's
      // tap is done the moment the POST lands, not after a second GET.
      void api<AttendanceSession[]>(`/groups/${group.id}/attendance`)
        .then((fresh) => {
          setSessions(fresh);
          put(`groups/${group.id}/attendance`, fresh);
        })
        .catch(() => {});
      // The student's own attendance view and the home counts both change.
      invalidate("student/attendance");
      invalidate("home");
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e instanceof ApiError ? e.message : tm("attendanceSaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const saveWeekly = async () => {
    if (!id || savingWeekly) return;
    setSavingWeekly(true);
    setError(null);
    try {
      await api("/teacher/weekly-notes", {
        method: "POST",
        body: {
          group_id: id,
          week_start: today,
          body: weeklyBody.trim(),
          is_published: false,
        },
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setWeeklySaved(true);
      // Same background-refetch pattern as the register: the summary list
      // updates when it is ready, the save feedback is not held hostage by it.
      void api<WeeklyNoteRow[]>("/teacher/weekly-notes", { query: { group_id: id } })
        .then(setWeekly)
        .catch(() => {});
    } catch (e) {
      setError(e instanceof ApiError ? e.message : tm("weeklySaved"));
    } finally {
      setSavingWeekly(false);
    }
  };

  if (!group || sessions === null) {
    return (
      <>
        <Stack.Screen options={{ title: tm("groups") }} />
        <Loading />
      </>
    );
  }

  const total = group.enrollments.length;
  const alreadyTaken = sessions.some((s) => s.session_date === activeDate);
  const editingPast = activeDate !== today;
  const pastWeekly = (weekly ?? []).filter((r) => r.week_start !== today);

  return (
    <>
      <Stack.Screen options={{ title: group.name }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: palette.background }}
        contentContainerStyle={{
          padding: space.xl,
          gap: space.lg,
          paddingBottom: insets.bottom + 120,
        }}
      >
        {error ? <ErrorNotice message={error} /> : null}

        {/* Progress header — how far through the register the teacher is. */}
        <Card>
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: palette.faint, fontWeight: "700", letterSpacing: 1 }}>
                {(editingPast
                  ? tm("editSession")
                  : alreadyTaken
                    ? tm("editingToday")
                    : tm("takingAttendance")
                ).toUpperCase()}
              </Text>
              <Text
                style={{ fontSize: 18, fontWeight: "700", color: palette.foreground, marginTop: 2 }}
              >
                {formatDate(activeDate, { weekday: "long", day: "numeric", month: "long" })}
              </Text>
            </View>
            <Text style={{ fontSize: 24, fontWeight: "700", color: palette.accent }}>
              {markedCount}
              <Text style={{ fontSize: 15, color: palette.faint, fontWeight: "600" }}>
                {" "}
                / {total}
              </Text>
            </Text>
          </View>

          <View style={{ marginTop: space.md }}>
            <ProgressBar value={total === 0 ? 0 : markedCount / total} />
          </View>

          {markedCount < total ? (
            <Button
              label={tm("markAllPresent")}
              variant="outline"
              onPress={markAllPresent}
              haptic="none"
              style={{ marginTop: space.md }}
            />
          ) : null}

          {editingPast ? (
            <Button
              label={tm("cancel")}
              variant="ghost"
              onPress={() => {
                setActiveDate(today);
                setSaved(false);
              }}
              haptic="none"
              style={{ marginTop: space.md }}
            />
          ) : null}
        </Card>

        {/* Everything else a teacher does with a group. Attendance stays on
            this screen because it is the one done every lesson. */}
        <View style={{ gap: space.md }}>
          <View style={{ flexDirection: "row", gap: space.md }}>
            <Button
              label={tm("homework")}
              icon="homework"
              variant="outline"
              haptic="none"
              onPress={() => router.push(`/(app)/groups/${group.id}/homework`)}
              style={{ flex: 1 }}
            />
            <Button
              label={tm("notes")}
              icon="notes"
              variant="outline"
              haptic="none"
              onPress={() => router.push(`/(app)/groups/${group.id}/notes`)}
              style={{ flex: 1 }}
            />
          </View>
          <View style={{ flexDirection: "row", gap: space.md }}>
            <Button
              label={tm("examReadiness")}
              icon="exams"
              variant="ghost"
              haptic="none"
              onPress={() => router.push(`/(app)/groups/${group.id}/readiness`)}
              style={{ flex: 1 }}
            />
            <Button
              label={tm("addPeople")}
              icon="students"
              variant="ghost"
              haptic="none"
              onPress={() => router.push(`/(app)/groups/${group.id}/people`)}
              style={{ flex: 1 }}
            />
          </View>
        </View>

        {total === 0 ? (
          <EmptyState icon="groups">{tm("noStudents")}</EmptyState>
        ) : (
          <View style={{ gap: space.md }}>
            {group.enrollments.map((e, i) => {
              const current = marks[e.studentProfileId];
              return (
                <Animated.View
                  key={e.id}
                  entering={FadeInDown.delay(Math.min(i * 28, 240)).duration(220)}
                  layout={Layout.springify()}
                >
                  <Card>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: space.md,
                        marginBottom: space.md,
                      }}
                    >
                      <Avatar name={e.studentName} size={38} />
                      <Text
                        style={{
                          flex: 1,
                          fontSize: 15,
                          fontWeight: "600",
                          color: palette.foreground,
                        }}
                      >
                        {e.studentName}
                      </Text>
                      {current ? (
                        <Chip
                          label={statusLabel(current)}
                          fg={statusColor[current].fg}
                          bg={statusColor[current].bg}
                        />
                      ) : null}
                    </View>

                    <View style={{ flexDirection: "row", gap: 6 }}>
                      {ATTENDANCE_STATUSES.map((status) => {
                        const active = current === status;
                        const c = statusColor[status];
                        return (
                          <Pressable
                            key={status}
                            accessibilityRole="button"
                            accessibilityLabel={`${e.studentName}: ${statusLabel(status)}`}
                            accessibilityState={{ selected: active }}
                            onPress={() => setStatus(e.studentProfileId, status)}
                            style={({ pressed }) => ({
                              flex: 1,
                              paddingVertical: 10,
                              borderRadius: radius.sm,
                              alignItems: "center",
                              borderWidth: 1.5,
                              borderColor: active ? c.fg : palette.cardBorder,
                              backgroundColor: active ? c.bg : "transparent",
                              opacity: pressed ? 0.65 : 1,
                            })}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: active ? "800" : "600",
                                color: active ? c.fg : palette.muted,
                              }}
                            >
                              {statusLabel(status)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </Card>
                </Animated.View>
              );
            })}
          </View>
        )}

        <View style={{ gap: space.md, marginTop: space.sm }}>
          <SectionTitle>{tm("recentSessions")}</SectionTitle>
          {sessions.length === 0 ? (
            <EmptyState icon="attendance">{tm("noAttendance")}</EmptyState>
          ) : (
            sessions.slice(0, 12).map((s) => {
              const present = s.attendance_records.filter((r) => r.status === "present").length;
              const rate = s.attendance_records.length
                ? present / s.attendance_records.length
                : 0;
              const active = s.session_date === activeDate;
              return (
                <Pressable
                  key={s.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => selectSession(s)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                >
                  <Card
                    style={{
                      borderColor: active ? palette.accent : palette.cardBorder,
                      borderWidth: active ? 1.5 : 1,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginBottom: space.sm,
                      }}
                    >
                      <Text style={{ color: palette.foreground, fontWeight: "600" }}>
                        {formatDate(s.session_date, {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
                        {active ? (
                          <Text style={{ color: palette.accent }}> · {tm("editSession")}</Text>
                        ) : null}
                      </Text>
                      <Text style={{ color: palette.muted, fontSize: 13, fontWeight: "600" }}>
                        {tm("presentCount", { present, total: s.attendance_records.length })}
                      </Text>
                    </View>
                    <ProgressBar
                      value={rate}
                      tint={rate >= 0.8 ? palette.accent : rate >= 0.5 ? palette.warning : palette.danger}
                    />
                  </Card>
                </Pressable>
              );
            })
          )}
        </View>

        {/* Weekly summary — the current week's note edited inline, past notes
            below. Saved as a draft; parents only see published notes. */}
        <View style={{ gap: space.md }}>
          <SectionTitle>{tm("weeklyNotes")}</SectionTitle>
          <Card style={{ gap: space.md }}>
            <Text style={{ fontSize: 13, color: palette.muted, fontWeight: "600" }}>
              {tm("weekOf", { date: formatDate(today, { day: "numeric", month: "long" }) })}
            </Text>
            <Field
              label={tm("weeklyNotes")}
              placeholder={tm("weeklySummaryPlaceholder")}
              value={weeklyBody}
              onChangeText={(t) => {
                setWeeklyBody(t);
                setWeeklySaved(false);
              }}
              multiline
            />
            <Button
              label={tm("saveWeeklySummary")}
              variant="outline"
              busy={savingWeekly}
              disabled={weeklyBody.trim().length === 0}
              onPress={saveWeekly}
              haptic="none"
            />
            {weeklySaved ? (
              <Text style={{ color: palette.accent, fontSize: 13, fontWeight: "600" }}>
                {tm("weeklySaved")}
              </Text>
            ) : null}
          </Card>

          {pastWeekly.length > 0 ? (
            <View style={{ gap: space.md }}>
              {pastWeekly.slice(0, 6).map((row) => (
                <Pressable
                  key={row.id}
                  accessibilityRole="button"
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setActiveDate(today);
                    setWeeklyBody(row.body);
                    setWeeklySaved(false);
                  }}
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                >
                  <Card>
                    <Text style={{ color: palette.foreground, fontWeight: "600" }}>
                      {tm("weekOf", {
                        date: formatDate(row.week_start, { day: "numeric", month: "long" }),
                      })}
                    </Text>
                    <Text
                      style={{ color: palette.muted, fontSize: 13, marginTop: 4 }}
                      numberOfLines={3}
                    >
                      {row.body}
                    </Text>
                  </Card>
                </Pressable>
              ))}
            </View>
          ) : (
            <EmptyState icon="notes">{tm("noWeeklyNotes")}</EmptyState>
          )}
        </View>
      </ScrollView>

      {/* Save stays reachable with one thumb, without scrolling back. */}
      {total > 0 ? (
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            padding: space.xl,
            paddingBottom: insets.bottom + space.md,
            backgroundColor: palette.background,
            borderTopWidth: 1,
            borderTopColor: palette.cardBorder,
          }}
        >
          <Button
            label={
              saved
                ? tm("saved")
                : markedCount === total
                  ? tm("saveAttendance")
                  : tm("savePartial", { done: markedCount, total })
            }
            onPress={save}
            busy={saving}
            disabled={markedCount === 0}
            haptic="none"
          />
        </View>
      ) : null}
    </>
  );
}
