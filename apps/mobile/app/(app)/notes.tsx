import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/lib/api";
import { useResource } from "@/lib/resource";
import { tm } from "@/lib/i18n";
import type { StudentProgressNote, StudentWeeklyNote } from "@/lib/types";
import { Card, EmptyState, ErrorNotice, FirstLoad, SectionTitle, SegmentedTabs } from "@/components/ui";
import { space, usePalette } from "@/theme";

type Tab = "progress" | "weekly";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/**
 * The student's notes: progress notes teachers wrote about them, and the
 * published weekly summaries for their groups. Mirrors the web student
 * portal pages; both read through the RLS branches that scope rows to the
 * caller's own profile / groups.
 */
export default function NotesScreen() {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("progress");

  const progress = useResource<{ notes: StudentProgressNote[] }>(
    "student/progress-notes",
    useCallback(() => api("/student/progress-notes"), []),
    { fallbackError: tm("loadFailed") },
  );
  const weekly = useResource<{ notes: StudentWeeklyNote[] }>(
    "student/weekly-notes",
    useCallback(() => api("/student/weekly-notes"), []),
    { fallbackError: tm("loadFailed") },
  );

  const active = tab === "progress" ? progress : weekly;
  const notes = active.data?.notes ?? [];

  const refresh = () => {
    void progress.refresh();
    void weekly.refresh();
  };

  if (progress.data === null && weekly.data === null) {
    return (
      <>
        <Stack.Screen options={{ title: tm("myNotes") }} />
        <FirstLoad error={active.error} />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: tm("myNotes") }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: palette.background }}
        contentContainerStyle={{
          padding: space.xl,
          gap: space.lg,
          paddingBottom: insets.bottom + space.xxl,
        }}
        refreshControl={
          <RefreshControl refreshing={active.refreshing} onRefresh={refresh} tintColor={palette.muted} />
        }
      >
        <SegmentedTabs<Tab>
          options={[
            { value: "progress", label: tm("myProgressNotes") },
            { value: "weekly", label: tm("weeklyNotes") },
          ]}
          value={tab}
          onChange={setTab}
        />

        {active.error ? <ErrorNotice message={active.error} /> : null}

        {notes.length === 0 ? (
          <EmptyState icon="notes">
            {tab === "progress" ? tm("noProgressNotes") : tm("noWeeklyNotes")}
          </EmptyState>
        ) : (
          notes.map((n) => {
            const progressNote = n as StudentProgressNote;
            const weeklyNote = n as StudentWeeklyNote;
            return (
              <Card key={n.id}>
                <View style={{ gap: space.xs }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: space.md }}>
                    <Text style={{ color: palette.muted, fontSize: 12 }}>
                      {tab === "progress"
                        ? formatDate(progressNote.createdAt)
                        : formatDate(weeklyNote.weekStart)}
                    </Text>
                    {tab === "weekly" && weeklyNote.groupName ? (
                      <Text style={{ color: palette.muted, fontSize: 12 }}>{weeklyNote.groupName}</Text>
                    ) : null}
                  </View>
                  <Text style={{ color: palette.foreground, fontSize: 14, lineHeight: 20 }}>
                    {n.body}
                  </Text>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </>
  );
}
