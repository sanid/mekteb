import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { api, ApiError } from "@/lib/api";
import { tm } from "@/lib/i18n";
import type { ExamRequest, GroupDetail } from "@/lib/types";
import {
  Avatar,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorNotice,
  Field,
  Loading,
  SectionTitle,
} from "@/components/ui";
import { space, usePalette } from "@/theme";

/**
 * Nominate students for the next exam round.
 *
 * A teacher marks a student test-ready; an examiner sees the request and
 * turns it into an exam session. Only the *pending* state is actionable here
 * — once an examiner has picked it up the request is out of the teacher's
 * hands (cancel is only allowed while pending, exactly like the web).
 */
export default function GroupReadinessScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const palette = usePalette();
  const insets = useSafeAreaInsets();

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [requests, setRequests] = useState<ExamRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // One open form at a time: which student's "mark test-ready" is expanded.
  const [open, setOpen] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const [g, all] = await Promise.all([
        api<GroupDetail>(`/teacher/groups/${id}`),
        api<ExamRequest[]>("/exam-requests"),
      ]);
      setGroup(g);
      setRequests(all.filter((r) => r.group_id === id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : tm("examActionFailed"));
    }
  }, [id]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const pending = useMemo(() => {
    const map = new Map<string, ExamRequest>();
    for (const r of requests ?? []) {
      if (r.status === "pending") map.set(r.student_profile_id, r);
    }
    return map;
  }, [requests]);

  if (!group || requests === null) {
    return (
      <>
        <Stack.Screen options={{ title: tm("examReadiness") }} />
        <Loading />
      </>
    );
  }

  const submit = async (studentProfileId: string) => {
    if (!id || busyId) return;
    setBusyId(studentProfileId);
    setError(null);
    try {
      await api("/exam-requests", {
        method: "POST",
        body: {
          student_profile_id: studentProfileId,
          group_id: id,
          notes: notes.trim() || null,
        },
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNotes("");
      setOpen(null);
      setRequests(
        (await api<ExamRequest[]>("/exam-requests")).filter((r) => r.group_id === id),
      );
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e instanceof ApiError ? e.message : tm("examRequestFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const cancel = async (requestId: string) => {
    if (busyId) return;
    setBusyId(requestId);
    setError(null);
    try {
      await api(`/exam-requests/${requestId}`, { method: "DELETE" });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setRequests(
        (await api<ExamRequest[]>("/exam-requests")).filter((r) => r.group_id === id),
      );
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e instanceof ApiError ? e.message : tm("examActionFailed"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: tm("examReadiness") }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: palette.background }}
        contentContainerStyle={{
          padding: space.xl,
          gap: space.lg,
          paddingBottom: insets.bottom + space.xxl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {error ? <ErrorNotice message={error} /> : null}

        <SectionTitle>{tm("examReadiness")}</SectionTitle>

        {group.enrollments.length === 0 ? (
          <EmptyState icon="students">{tm("noStudents")}</EmptyState>
        ) : (
          group.enrollments.map((e, i) => {
            const req = pending.get(e.studentProfileId);
            const expanded = open === e.studentProfileId;
            return (
              <Animated.View
                key={e.id}
                entering={FadeInDown.delay(Math.min(i * 30, 240)).duration(200)}
              >
                <Card>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
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
                    {req ? (
                      <Chip label={tm("testReady")} fg={palette.accent} bg={palette.accentSubtle} />
                    ) : null}
                  </View>

                  {req ? (
                    <View
                      style={{
                        marginTop: space.md,
                        borderTopWidth: 1,
                        borderTopColor: palette.cardBorder,
                        paddingTop: space.md,
                        gap: space.sm,
                      }}
                    >
                      {req.notes ? (
                        <Text style={{ color: palette.muted, fontSize: 13 }}>{req.notes}</Text>
                      ) : null}
                      <Button
                        label={tm("cancelRequest")}
                        variant="ghost"
                        busy={busyId === req.id}
                        onPress={() => cancel(req.id)}
                        haptic="none"
                      />
                    </View>
                  ) : (
                    <View
                      style={{
                        marginTop: space.md,
                        borderTopWidth: 1,
                        borderTopColor: palette.cardBorder,
                        paddingTop: space.md,
                        gap: space.sm,
                      }}
                    >
                      {expanded ? (
                        <>
                          <Field
                            label={tm("testReadinessNotes")}
                            value={notes}
                            onChangeText={setNotes}
                            multiline
                            autoFocus
                          />
                          <View style={{ flexDirection: "row", gap: space.md }}>
                            <Button
                              label={tm("cancel")}
                              variant="ghost"
                              onPress={() => {
                                setOpen(null);
                                setNotes("");
                              }}
                              haptic="none"
                              style={{ flex: 1 }}
                            />
                            <Button
                              label={tm("markTestReady")}
                              busy={busyId === e.studentProfileId}
                              onPress={() => submit(e.studentProfileId)}
                              haptic="none"
                              style={{ flex: 1 }}
                            />
                          </View>
                        </>
                      ) : (
                        <Button
                          label={tm("markTestReady")}
                          variant="outline"
                          onPress={() => {
                            void Haptics.selectionAsync();
                            setOpen(e.studentProfileId);
                            setNotes("");
                          }}
                          haptic="none"
                        />
                      )}
                    </View>
                  )}
                </Card>
              </Animated.View>
            );
          })
        )}
      </ScrollView>
    </>
  );
}
