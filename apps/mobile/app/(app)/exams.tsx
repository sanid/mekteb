import { useCallback } from "react";
import { RefreshControl, ScrollView } from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/lib/api";
import { useResource } from "@/lib/resource";
import { tm } from "@/lib/i18n";
import type { StudentExamSession } from "@/lib/types";
import { ErrorNotice, FirstLoad } from "@/components/ui";
import { ExamList } from "@/components/exam-list";
import { space, usePalette } from "@/theme";

/**
 * The student's own exams. The list, the statuses and the accept / counter /
 * cancel actions all live in `ExamList`, which the parent's child screen
 * renders too — the two must not drift.
 */
export default function ExamsScreen() {
  const palette = usePalette();
  const insets = useSafeAreaInsets();

  const {
    data: sessions,
    error,
    refreshing,
    refresh,
  } = useResource<StudentExamSession[]>(
    "student/exams",
    useCallback(
      async () =>
        (await api<{ sessions: StudentExamSession[] }>("/student/exams")).sessions ?? [],
      [],
    ),
    { fallbackError: tm("examsLoadFailed") },
  );

  if (sessions === null) {
    return (
      <>
        <Stack.Screen options={{ title: tm("exams") }} />
        <FirstLoad error={error} />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: tm("exams") }} />
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
        {error ? <ErrorNotice message={error} /> : null}

        <ExamList
          sessions={sessions}
          // A parent looking at the same exam on the child screen must not keep
          // seeing the date this student just changed.
          invalidateKeys={["student/exams", "parent/children"]}
          onChanged={refresh}
        />
      </ScrollView>
    </>
  );
}
