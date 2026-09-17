import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, ApiError } from "@/lib/api";
import { invalidate, useResource } from "@/lib/resource";
import { formatDate, tm } from "@/lib/i18n";
import type { StudentHomework } from "@/lib/types";
import {
  Button,
  Card,
  EmptyState,
  ErrorNotice,
  FirstLoad,
  SectionTitle,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { usePalette } from "@/theme";

export default function HomeworkScreen() {
  const palette = usePalette();
  const insets = useSafeAreaInsets();

  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data: items,
    error: loadError,
    refreshing,
    refresh,
    set,
  } = useResource<StudentHomework[]>(
    "student/homework",
    useCallback(() => api<StudentHomework[]>("/student/homework"), []),
    { fallbackError: tm("homeworkLoadFailed") },
  );

  const error = actionError ?? loadError;

  const acknowledge = async (id: string) => {
    setBusyId(id);
    setActionError(null);
    // Optimistic: the action is idempotent server-side and keeps the first
    // timestamp, so a failed request can simply be reverted.
    const previous = items;
    set((list) =>
      (list ?? []).map((h) =>
        h.id === id ? { ...h, acknowledgedAt: new Date().toISOString() } : h,
      ),
    );
    try {
      await api(`/student/homework/${id}/acknowledge`, { method: "POST" });
      // The home screen counts outstanding homework.
      invalidate("home");
    } catch (e) {
      if (previous) set(previous);
      setActionError(e instanceof ApiError ? e.message : tm("ackFailed"));
    } finally {
      setBusyId(null);
    }
  };

  if (items === null) {
    return (
      <>
        <Stack.Screen options={{ title: tm("homework") }} />
        <FirstLoad error={error} />
      </>
    );
  }

  const todo = items.filter((h) => !h.acknowledgedAt);
  const done = items.filter((h) => h.acknowledgedAt);

  const renderItem = (h: StudentHomework) => (
    <Card key={h.id}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
        <Text
          style={{ flex: 1, fontSize: 15, fontWeight: "600", color: palette.foreground }}
        >
          {h.title}
        </Text>
        {h.dueDate ? (
          <Text style={{ fontSize: 12, color: palette.muted }}>
            {formatDate(h.dueDate, { month: "short", day: "numeric" })}
          </Text>
        ) : null}
      </View>

      {h.body ? (
        <Text style={{ color: palette.muted, fontSize: 14, marginTop: 6 }}>{h.body}</Text>
      ) : null}

      {h.groupName ? (
        <Text style={{ color: palette.muted, fontSize: 12, marginTop: 8 }}>{h.groupName}</Text>
      ) : null}

      {h.acknowledgedAt ? (
        <View
          style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 }}
        >
          <Icon name="done" size={15} color={palette.accent} />
          <Text style={{ color: palette.accent, fontSize: 13, fontWeight: "600" }}>
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
  );

  return (
    <>
      <Stack.Screen options={{ title: tm("homework") }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: palette.background }}
        contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: insets.bottom + 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={palette.muted} />
        }
      >
        {error ? <ErrorNotice message={error} /> : null}

        <SectionTitle>{tm("toDo", { count: todo.length })}</SectionTitle>
        {todo.length === 0 ? <EmptyState>{tm("allCaughtUp")}</EmptyState> : todo.map(renderItem)}

        {done.length > 0 ? (
          <>
            <View style={{ marginTop: 12 }}>
              <SectionTitle>{tm("done")}</SectionTitle>
            </View>
            {done.map(renderItem)}
          </>
        ) : null}
      </ScrollView>
    </>
  );
}
