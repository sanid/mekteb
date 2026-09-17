import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { api, ApiError } from "@/lib/api";
import { invalidate, useResource } from "@/lib/resource";
import { formatDate, tm } from "@/lib/i18n";
import type { CheckinSession } from "@/lib/types";
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  ErrorNotice,
  FirstLoad,
} from "@/components/ui";
import { space, usePalette } from "@/theme";
import { Icon } from "@/components/icon";

/**
 * A live check-in session, opened by code or deep link. Lists who may check
 * in (the student themself, or the parent's linked children enrolled in the
 * group) with their current state, and marks a student present — the mobile
 * half of the web `/checkin/[token]` page.
 */
export default function CheckinSessionScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, error, refreshing, refresh, set } = useResource<CheckinSession>(
    token ? `checkin/${token}` : null,
    useCallback(() => api<CheckinSession>(`/checkin/${token}`), [token]),
    { fallbackError: tm("checkinLoadFailed") },
  );

  const markPresent = async (studentId: string) => {
    if (busyId) return;
    setBusyId(studentId);
    setActionError(null);
    void Haptics.selectionAsync();
    // Optimistic: the checkmark appears on tap, the POST reconciles behind it.
    const previous = data;
    set((current) =>
      current
        ? {
            ...current,
            students: current.students.map((s) =>
              s.id === studentId ? { ...s, present: true } : s,
            ),
          }
        : current!,
    );
    try {
      await api(`/checkin/${token}`, { method: "POST", body: { studentId } });
      invalidate("attendance");
      invalidate("student/attendance");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void refresh();
    } catch (e) {
      if (previous) set(previous);
      setActionError(e instanceof ApiError ? e.message : tm("checkinActionFailed"));
    } finally {
      setBusyId(null);
    }
  };

  if (data === null) {
    return (
      <>
        <Stack.Screen options={{ title: tm("checkin") }} />
        <FirstLoad error={error} />
      </>
    );
  }

  const allPresent = data.students.every((s) => s.present);

  return (
    <>
      <Stack.Screen options={{ title: tm("checkin") }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: palette.background }}
        contentContainerStyle={{
          padding: space.xl,
          gap: space.md,
          paddingBottom: insets.bottom + space.xxl,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={palette.muted} />
        }
      >
        <Card style={{ gap: 4 }}>
          <Text style={{ color: palette.foreground, fontWeight: "700", fontSize: 18 }}>
            {data.groupName}
          </Text>
          <Text style={{ color: palette.muted, fontSize: 13 }}>
            {formatDate(data.sessionDate, { weekday: "short", day: "numeric", month: "long" })}
          </Text>
        </Card>

        {error ? <ErrorNotice message={error} /> : null}
        {actionError ? <ErrorNotice message={actionError} /> : null}

        {data.students.length === 0 ? (
          <EmptyState icon="students">{tm("checkinNotEligible")}</EmptyState>
        ) : (
          data.students.map((s) => (
            <Card key={s.id} style={{ gap: space.sm }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
                <Avatar name={s.full_name} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: palette.foreground, fontWeight: "700", fontSize: 15 }}>
                    {s.full_name}
                  </Text>
                  <Text
                    style={{
                      color: s.present ? palette.accent : palette.muted,
                      fontSize: 12,
                      fontWeight: "600",
                      marginTop: 2,
                    }}
                  >
                    {s.present ? tm("checkinPresent") : tm("checkinNotYet")}
                  </Text>
                </View>
                {s.present ? (
                  <Icon name="done" size={20} color={palette.accent} />
                ) : (
                  <Button
                    label={tm("checkinMark")}
                    busy={busyId === s.id}
                    disabled={!!busyId}
                    onPress={() => void markPresent(s.id)}
                  />
                )}
              </View>
            </Card>
          ))
        )}

        {allPresent ? (
          <Text style={{ color: palette.muted, fontSize: 13, textAlign: "center" }}>
            {tm("checkinAllDone")}
          </Text>
        ) : null}
      </ScrollView>
    </>
  );
}
