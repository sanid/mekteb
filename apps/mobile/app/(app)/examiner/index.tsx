import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { api, ApiError } from "@/lib/api";
import { invalidate, useResource } from "@/lib/resource";
import { formatDate, tm } from "@/lib/i18n";
import type { ExaminerInbox, ExaminerSession, LessonChecklist } from "@/lib/types";
import {
  Avatar,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorNotice,
  Field,
  FirstLoad,
  SectionTitle,
} from "@/components/ui";
import { DatePickerSheet } from "@/components/date-picker";
import { Icon } from "@/components/icon";
import { radius, space, usePalette } from "@/theme";

/**
 * The examiner's inbox: requests teachers filed (propose a date + which parts
 * the exam covers), then the sessions through the whole life cycle — propose,
 * accept or counter the student/parent's date, start, record pass or fail,
 * and propose a retake after a fail. This is the mobile half of the web
 * examiner portal's exam workflow; the written-tests and diploma paperwork
 * stay on web.
 */

/** Which of the two exam parts is ticked, for a proposal form. */
type Parts = { oral: boolean; written: boolean };

const PART_NONE = { oral: false, written: false };

export default function ExaminerScreen() {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  /** Which request has the schedule form open. */
  const [scheduleFor, setScheduleFor] = useState<string | null>(null);
  /** Which failed session has the retake form open. */
  const [retakeFor, setRetakeFor] = useState<string | null>(null);
  /** Which session has the pass/fail summary open. */
  const [resultFor, setResultFor] = useState<string | null>(null);
  const [resultStatus, setResultStatus] = useState<"passed" | "failed">("passed");
  const [summary, setSummary] = useState("");
  /** Parts for the currently open proposal form (schedule or retake). */
  const [parts, setParts] = useState<Parts>(PART_NONE);
  /** Which form is waiting for a date picker choice. */
  const [dateFor, setDateFor] = useState<"schedule" | "retake" | null>(null);
  /** Which session is getting a counter date proposed. */
  const [counterFor, setCounterFor] = useState<string | null>(null);

  const { data, refreshing, refresh, set } = useResource<ExaminerInbox>(
    "examiner",
    useCallback(() => api<ExaminerInbox>("/exams"), []),
    { fallbackError: tm("examsLoadFailed") },
  );

  const run = async (id: string, fn: () => Promise<void>) => {
    if (busyId) return;
    setBusyId(id);
    setError(null);
    try {
      await fn();
      set(await api<ExaminerInbox>("/exams"));
      invalidate("student/exams");
      invalidate("home");
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e instanceof ApiError ? e.message : tm("examActionFailed"));
    } finally {
      setBusyId(null);
    }
  };

  /** Create a session from a request, with the chosen date and parts. */
  const schedule = (requestId: string, date: string) =>
    run(requestId, async () => {
      await api("/exams", {
        method: "POST",
        body: {
          request_id: requestId,
          proposed_date: date,
          oral_required: parts.oral,
          written_required: parts.written,
        },
      });
      setScheduleFor(null);
      setParts(PART_NONE);
    });

  /** The examiner proposes a different date back to the student/parent. */
  const counter = (sessionId: string, date: string) =>
    run(sessionId, async () => {
      await api(`/exams/${sessionId}/schedule`, {
        method: "POST",
        body: { proposed_date: date },
      });
      setCounterFor(null);
    });

  /** Accept the date the student/parent proposed. */
  const confirm = (sessionId: string) =>
    run(sessionId, async () => {
      await api(`/exams/${sessionId}/confirm`, { method: "POST", body: {} });
    });

  /** Propose a retake for a failed session. */
  const retake = (sessionId: string, date: string) =>
    run(sessionId, async () => {
      await api(`/exams/${sessionId}/retake`, {
        method: "POST",
        body: {
          proposed_date: date,
          oral_required: parts.oral,
          written_required: parts.written,
        },
      });
      setRetakeFor(null);
      setParts(PART_NONE);
    });

  const setStatus = (session: ExaminerSession, status: string, note?: string | null) =>
    run(session.id, async () => {
      await api(`/exams/${session.id}`, {
        method: "PATCH",
        body: { status, summary: note ?? session.summary ?? null },
      });
    });

  if (!data) {
    return (
      <>
        <Stack.Screen options={{ title: tm("examiner") }} />
        <FirstLoad error={error} />
      </>
    );
  }

  const statusChip = (status: string) => {
    const map: Record<string, { label: string; fg: string; bg: string }> = {
      proposed: { label: tm("examProposed"), fg: palette.info, bg: palette.infoSubtle },
      scheduled: { label: tm("examScheduled"), fg: palette.info, bg: palette.infoSubtle },
      in_progress: { label: tm("examInProgress"), fg: palette.warning, bg: palette.warningSubtle },
      passed: { label: tm("examPassed"), fg: palette.accent, bg: palette.accentSubtle },
      failed: { label: tm("examFailed"), fg: palette.danger, bg: palette.dangerSubtle },
    };
    return map[status];
  };

  /** The shared part-toggles row used by schedule and retake forms. */
  const PartToggles = () => (
    <View style={{ flexDirection: "row", gap: space.sm }}>
      {(
        [
          { key: "oral" as const, label: tm("examPartOral") },
          { key: "written" as const, label: tm("examPartWritten") },
        ] as const
      ).map(({ key, label }) => {
        const on = parts[key];
        return (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => {
              void Haptics.selectionAsync();
              setParts((p) => ({ ...p, [key]: !p[key] }));
            }}
            style={({ pressed }) => ({
              paddingHorizontal: space.md,
              paddingVertical: space.sm,
              borderRadius: radius.pill,
              borderWidth: 1.5,
              borderColor: on ? palette.accent : palette.cardBorder,
              backgroundColor: on ? palette.accentSubtle : "transparent",
              opacity: pressed ? 0.65 : 1,
            })}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: on ? "800" : "600",
                color: on ? palette.accent : palette.muted,
              }}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  /** A date picker for the open proposal form. */
  const pickFor = (form: "schedule" | "retake") => {
    if (dateFor === form) {
      setDateFor(null);
      return;
    }
    setDateFor(form);
  };

  const partsOk = parts.oral || parts.written;

  return (
    <>
      <Stack.Screen options={{ title: tm("examiner") }} />
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

        <View style={{ gap: space.md }}>
          <SectionTitle>{tm("examRequests")}</SectionTitle>
          {data.pendingRequests.length === 0 ? (
            <EmptyState icon="exams">{tm("noExamRequests")}</EmptyState>
          ) : (
            data.pendingRequests.map((r, i) => (
              <Animated.View
                key={r.id}
                entering={FadeInDown.delay(Math.min(i * 30, 240)).duration(200)}
              >
                <Card>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
                    <Avatar name={r.student_profiles?.full_name ?? "?"} size={36} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: palette.foreground, fontWeight: "700", fontSize: 15 }}>
                        {r.student_profiles?.full_name ?? "?"}
                      </Text>
                      <Text style={{ color: palette.muted, fontSize: 13, marginTop: 1 }}>
                        {r.groups?.name ?? ""}
                        {r.teacher_profiles?.profiles?.full_name
                          ? ` · ${tm("requestedBy")} ${r.teacher_profiles.profiles.full_name}`
                          : ""}
                      </Text>
                    </View>
                    <Text style={{ color: palette.faint, fontSize: 12 }}>
                      {formatDate(r.created_at, { day: "numeric", month: "short" })}
                    </Text>
                  </View>

                  {r.notes ? (
                    <Text style={{ color: palette.muted, fontSize: 13, marginTop: space.sm }}>
                      {r.notes}
                    </Text>
                  ) : null}

                  {scheduleFor === r.id ? (
                    <View
                      style={{
                        marginTop: space.md,
                        borderTopWidth: 1,
                        borderTopColor: palette.cardBorder,
                        paddingTop: space.md,
                        gap: space.md,
                      }}
                    >
                      <PartToggles />
                      <Text style={{ color: palette.faint, fontSize: 12 }}>
                        {tm("examPartsHint")}
                      </Text>
                      <View style={{ flexDirection: "row", gap: space.md }}>
                        <Button
                          label={tm("cancel")}
                          variant="ghost"
                          onPress={() => {
                            setScheduleFor(null);
                            setParts(PART_NONE);
                          }}
                          haptic="none"
                          style={{ flex: 1 }}
                        />
                        <Button
                          label={tm("proposeDate")}
                          disabled={!partsOk}
                          onPress={() => pickFor("schedule")}
                          haptic="none"
                          style={{ flex: 1 }}
                        />
                      </View>
                    </View>
                  ) : (
                    <Button
                      label={tm("scheduleExam")}
                      variant="outline"
                      onPress={() => {
                        void Haptics.selectionAsync();
                        setScheduleFor(r.id);
                        setParts(PART_NONE);
                      }}
                      haptic="none"
                      style={{ marginTop: space.md }}
                    />
                  )}
                </Card>
              </Animated.View>
            ))
          )}
        </View>

        <View style={{ gap: space.md }}>
          <SectionTitle>{tm("examSessions")}</SectionTitle>
          {data.sessions.length === 0 ? (
            <EmptyState icon="exams">{tm("noExams")}</EmptyState>
          ) : (
            data.sessions.map((s, i) => {
              const chip = statusChip(s.status);
              const recording = resultFor === s.id;
              const awaitingThem =
                s.status === "proposed" &&
                s.schedule_status !== "confirmed" &&
                s.proposed_by === "examiner";
              const theyProposed =
                s.status !== "passed" &&
                s.status !== "failed" &&
                s.schedule_status === "counter_proposed" &&
                s.proposed_by !== "examiner" &&
                !!s.proposed_date;
              return (
                <Animated.View
                  key={s.id}
                  entering={FadeInDown.delay(Math.min(i * 30, 240)).duration(200)}
                >
                  <Card>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
                      <Avatar name={s.student_profiles?.full_name ?? "?"} size={36} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: palette.foreground, fontWeight: "700", fontSize: 15 }}>
                          {s.student_profiles?.full_name ?? "?"}
                        </Text>
                        <Text style={{ color: palette.muted, fontSize: 13, marginTop: 1 }}>
                          {s.groups?.name ?? ""}
                          {s.exam_date
                            ? ` · ${formatDate(s.exam_date, { day: "numeric", month: "short" })}`
                            : ""}
                        </Text>
                      </View>
                      {chip ? (
                        <Chip label={chip.label} fg={chip.fg} bg={chip.bg} />
                      ) : (
                        <Chip label={s.status} fg={palette.muted} bg={palette.surface} />
                      )}
                    </View>

                    {/* What the exam consists of. */}
                    {(s.oral_required || s.written_required) && s.status !== "passed" && s.status !== "failed" ? (
                      <View style={{ flexDirection: "row", gap: 6, marginTop: space.sm }}>
                        {s.oral_required ? (
                          <Chip label={tm("examPartOral")} fg={palette.muted} bg={palette.surface} />
                        ) : null}
                        {s.written_required ? (
                          <Chip label={tm("examPartWritten")} fg={palette.muted} bg={palette.surface} />
                        ) : null}
                      </View>
                    ) : null}

                    {s.summary ? (
                      <Text style={{ color: palette.muted, fontSize: 13, marginTop: space.sm }}>
                        {s.summary}
                      </Text>
                    ) : null}

                    {/* Lessons ticked off during the exam — interactive while
                        the exam runs, a read-only result after. */}
                    {["scheduled", "in_progress", "passed", "failed"].includes(s.status) ? (
                      <ExamLessonChecklist
                        sessionId={s.id}
                        editable={s.status === "in_progress" || s.status === "scheduled"}
                      />
                    ) : null}

                    {/* Build the online written test for a session that needs
                        one — the mobile half of the web test builder. */}
                    {s.written_required &&
                    s.status !== "passed" &&
                    s.status !== "failed" ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => {
                          void Haptics.selectionAsync();
                          router.push(
                            `/(app)/examiner/create-test?sessionId=${s.id}&studentName=${encodeURIComponent(
                              s.student_profiles?.full_name ?? "",
                            )}`,
                          );
                        }}
                        style={{ marginTop: space.sm }}
                        hitSlop={8}
                      >
                        <Text style={{ color: palette.accent, fontWeight: "700", fontSize: 13 }}>
                          + {tm("createWrittenTest")}
                        </Text>
                      </Pressable>
                    ) : null}

                    {awaitingThem ? (
                      <View
                        style={{
                          marginTop: space.md,
                          borderTopWidth: 1,
                          borderTopColor: palette.cardBorder,
                          paddingTop: space.md,
                          gap: space.sm,
                        }}
                      >
                        <Text style={{ color: palette.warning, fontSize: 13, fontWeight: "600" }}>
                          {tm("awaitingStudentConfirm")}
                        </Text>
                        <Button
                          label={tm("proposeNewDate")}
                          variant="outline"
                          busy={busyId === s.id}
                          onPress={() => setCounterFor(s.id)}
                          haptic="none"
                        />
                      </View>
                    ) : null}

                    {theyProposed ? (
                      <View
                        style={{
                          marginTop: space.md,
                          borderTopWidth: 1,
                          borderTopColor: palette.cardBorder,
                          paddingTop: space.md,
                          gap: space.sm,
                        }}
                      >
                        <Text style={{ color: palette.muted, fontSize: 13 }}>
                          {tm("studentProposedDate")}:{" "}
                          <Text style={{ fontWeight: "700", color: palette.foreground }}>
                            {formatDate(s.proposed_date!, {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                            })}
                          </Text>
                        </Text>
                        <View style={{ flexDirection: "row", gap: space.md }}>
                          <Button
                            label={tm("acceptDate")}
                            busy={busyId === s.id}
                            onPress={() => confirm(s.id)}
                            haptic="none"
                            style={{ flex: 1 }}
                          />
                          <Button
                            label={tm("proposeNewDate")}
                            variant="outline"
                            busy={busyId === s.id}
                            onPress={() => setCounterFor(s.id)}
                            haptic="none"
                            style={{ flex: 1 }}
                          />
                        </View>
                      </View>
                    ) : null}

                    {/* Scheduled (confirmed): the exam can start. */}
                    {s.status === "scheduled" && s.schedule_status === "confirmed" ? (
                      <Button
                        label={tm("startExam")}
                        variant="outline"
                        busy={busyId === s.id}
                        onPress={() => setStatus(s, "in_progress")}
                        haptic="none"
                        style={{ marginTop: space.md }}
                      />
                    ) : null}

                    {s.status === "in_progress" ? (
                      <View style={{ marginTop: space.md, gap: space.sm }}>
                        {recording ? (
                          <>
                            <Field
                              label={tm("examSummary")}
                              value={summary}
                              onChangeText={setSummary}
                              multiline
                              autoFocus
                            />
                            <View style={{ flexDirection: "row", gap: space.md }}>
                              <Button
                                label={tm("cancel")}
                                variant="ghost"
                                onPress={() => {
                                  setResultFor(null);
                                  setSummary("");
                                }}
                                haptic="none"
                                style={{ flex: 1 }}
                              />
                              <Button
                                label={resultStatus === "passed" ? tm("examPassed") : tm("examFailed")}
                                busy={busyId === s.id}
                                onPress={() => setStatus(s, resultStatus, summary.trim() || null)}
                                haptic="none"
                                style={{ flex: 1 }}
                              />
                            </View>
                          </>
                        ) : (
                          <View style={{ flexDirection: "row", gap: space.md }}>
                            <Pressable
                              accessibilityRole="button"
                              onPress={() => {
                                void Haptics.selectionAsync();
                                setResultFor(s.id);
                                setResultStatus("passed");
                                setSummary(s.summary ?? "");
                              }}
                              style={({ pressed }) => ({
                                flex: 1,
                                paddingVertical: 12,
                                borderRadius: radius.md,
                                borderWidth: 1,
                                borderColor: palette.accent,
                                backgroundColor: palette.accentSubtle,
                                alignItems: "center",
                                opacity: pressed ? 0.7 : 1,
                              })}
                            >
                              <Text style={{ color: palette.accent, fontWeight: "700", fontSize: 14 }}>
                                {tm("recordPassed")}
                              </Text>
                            </Pressable>
                            <Pressable
                              accessibilityRole="button"
                              onPress={() => {
                                void Haptics.selectionAsync();
                                setResultFor(s.id);
                                setResultStatus("failed");
                                setSummary(s.summary ?? "");
                              }}
                              style={({ pressed }) => ({
                                flex: 1,
                                paddingVertical: 12,
                                borderRadius: radius.md,
                                borderWidth: 1,
                                borderColor: palette.danger,
                                backgroundColor: palette.dangerSubtle,
                                alignItems: "center",
                                opacity: pressed ? 0.7 : 1,
                              })}
                            >
                              <Text style={{ color: palette.danger, fontWeight: "700", fontSize: 14 }}>
                                {tm("recordFailed")}
                              </Text>
                            </Pressable>
                          </View>
                        )}
                      </View>
                    ) : null}

                    {s.status === "failed" ? (
                      <View style={{ marginTop: space.md, gap: space.md }}>
                        {retakeFor === s.id ? (
                          <>
                            <PartToggles />
                            <Text style={{ color: palette.faint, fontSize: 12 }}>
                              {tm("examPartsHint")}
                            </Text>
                            <View style={{ flexDirection: "row", gap: space.md }}>
                              <Button
                                label={tm("cancel")}
                                variant="ghost"
                                onPress={() => {
                                  setRetakeFor(null);
                                  setParts(PART_NONE);
                                }}
                                haptic="none"
                                style={{ flex: 1 }}
                              />
                              <Button
                                label={tm("proposeDate")}
                                disabled={!partsOk}
                                onPress={() => pickFor("retake")}
                                haptic="none"
                                style={{ flex: 1 }}
                              />
                            </View>
                          </>
                        ) : (
                          <Button
                            label={tm("proposeRetake")}
                            variant="outline"
                            onPress={() => {
                              void Haptics.selectionAsync();
                              setRetakeFor(s.id);
                              setParts(PART_NONE);
                            }}
                            haptic="none"
                          />
                        )}
                      </View>
                    ) : null}
                  </Card>
                </Animated.View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* One date picker for all three proposal forms. */}
      {dateFor === "schedule" && scheduleFor ? (
        <DatePickerSheet
          open
          onClose={() => setDateFor(null)}
          onPick={(date) => {
            const id = scheduleFor;
            setDateFor(null);
            void schedule(id, date);
          }}
        />
      ) : null}
      {dateFor === "retake" && retakeFor ? (
        <DatePickerSheet
          open
          onClose={() => setDateFor(null)}
          onPick={(date) => {
            const id = retakeFor;
            setDateFor(null);
            void retake(id, date);
          }}
        />
      ) : null}
      {counterFor ? (
        <DatePickerSheet
          open
          onClose={() => setCounterFor(null)}
          onPick={(date) => {
            const id = counterFor;
            setCounterFor(null);
            void counter(id, date);
          }}
        />
      ) : null}
    </>
  );
}

/**
 * The lesson checklist for one exam session: the mosque's curriculum with the
 * lessons ticked off. While `editable` each row is a live toggle (the tick is
 * saved immediately, exactly as the web page does); once the result is
 * terminal the list is read-only — ticked lessons were good, the rest need
 * to be repeated.
 */
function ExamLessonChecklist({
  sessionId,
  editable,
}: {
  sessionId: string;
  editable: boolean;
}) {
  const palette = usePalette();

  const [open, setOpen] = useState(false);
  const [data, setData] = useState<LessonChecklist | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyLesson, setBusyLesson] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (data) return;
    setError(null);
    try {
      setData(await api<LessonChecklist>(`/exams/${sessionId}/lesson-checks`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : tm("lessonChecklistLoadFailed"));
    }
  }, [sessionId, data]);

  const toggle = async (lessonId: string) => {
    if (!editable || busyLesson || !data) return;
    const on = data.checked.includes(lessonId);
    // Optimistic — a failed save flips back below.
    setBusyLesson(lessonId);
    setError(null);
    setData({
      ...data,
      checked: on
        ? data.checked.filter((id) => id !== lessonId)
        : [...data.checked, lessonId],
    });
    try {
      await api(`/exams/${sessionId}/lesson-checks`, {
        method: "POST",
        body: { lesson_id: lessonId, passed: !on },
      });
      void Haptics.selectionAsync();
    } catch (e) {
      setData({
        ...data,
        checked: on
          ? [...data.checked, lessonId]
          : data.checked.filter((id) => id !== lessonId),
      });
      setError(e instanceof ApiError ? e.message : tm("lessonCheckFailed"));
    } finally {
      setBusyLesson(null);
    }
  };

  const checked = data?.checked ?? [];
  const total = data?.lessons.length ?? 0;
  const ticked = checked.filter((id) => data!.lessons.some((l) => l.id === id)).length;

  return (
    <View style={{ marginTop: space.md }}>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          void Haptics.selectionAsync();
          setOpen((v) => !v);
          if (!open) void load();
        }}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: space.sm,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Text style={{ color: palette.accent, fontWeight: "700", fontSize: 14, flex: 1 }}>
          {tm("lessonChecklist")}
        </Text>
        {data ? (
          <Text style={{ color: palette.faint, fontSize: 12, fontWeight: "600" }}>
            {tm("lessonsChecked", { done: ticked, total })}
          </Text>
        ) : null}
      </Pressable>

      {open ? (
        <View
          style={{
            marginTop: space.sm,
            borderTopWidth: 1,
            borderTopColor: palette.cardBorder,
            paddingTop: space.sm,
            gap: 2,
          }}
        >
          {error ? <ErrorNotice message={error} /> : null}
          {data && data.lessons.length === 0 ? (
            <Text style={{ color: palette.muted, fontSize: 13 }}>{tm("noLessons")}</Text>
          ) : null}
          {data
            ? data.lessons.map((lesson) => {
                const on = checked.includes(lesson.id);
                return (
                  <Pressable
                    key={lesson.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on, disabled: !editable }}
                    disabled={!editable || busyLesson === lesson.id}
                    onPress={() => void toggle(lesson.id)}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      gap: space.sm,
                      paddingVertical: space.sm,
                      opacity: pressed ? 0.6 : 1,
                    })}
                  >
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        borderWidth: 1.5,
                        borderColor: on ? palette.accent : palette.cardBorder,
                        backgroundColor: on ? palette.accent : "transparent",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {on ? (
                        <Icon name="done" size={14} color={palette.onAccent} />
                      ) : null}
                    </View>
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 14,
                        color: on ? palette.foreground : palette.muted,
                        fontWeight: on ? "600" : "400",
                      }}
                    >
                      {lesson.title}
                    </Text>
                    {!on && !editable ? (
                      <Text style={{ color: palette.danger, fontSize: 12, fontWeight: "600" }}>
                        {tm("toRepeat")}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })
            : null}
          {editable && data && total - ticked > 0 ? (
            <Text style={{ color: palette.faint, fontSize: 12, marginTop: space.sm }}>
              {tm("lessonChecklistHint")}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
