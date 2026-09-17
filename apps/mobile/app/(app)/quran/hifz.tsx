import { useCallback } from "react";
import { ScrollView, Text, View } from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/lib/api";
import { useResource } from "@/lib/resource";
import { formatDate, tm } from "@/lib/i18n";
import { Card, EmptyState, ErrorNotice, Loading, ProgressRing, SectionTitle } from "@/components/ui";
import { space, usePalette } from "@/theme";

type Hifz = {
  pagesMemorized: number;
  pagesTotal: number;
  juzMemorized: number;
  percentComplete: number;
  groups: Array<{
    groupId: string;
    groupName: string | null;
    pagesMemorized: number;
    notes: string | null;
    updatedAt: string;
  }>;
};

/**
 * Hifz progress. Read-only by design: `hifz_progress` is keyed on
 * (student_profile_id, group_id) and written by the teacher who assessed the
 * student — the API has no student write path.
 *
 * The reader itself (surah text + audio) comes next; the text will be bundled
 * so it works offline, with audio streamed.
 */
export default function QuranScreen() {
  const palette = usePalette();
  const insets = useSafeAreaInsets();

  const { data: hifz, error } = useResource<Hifz>(
    "student/hifz",
    useCallback(() => api<Hifz>("/student/hifz"), []),
    { fallbackError: tm("hifzLoadFailed") },
  );

  if (!hifz && !error) {
    return (
      <>
        <Stack.Screen options={{ title: tm("quran") }} />
        <Loading />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: tm("quran") }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: palette.background }}
        contentContainerStyle={{
          padding: space.xl,
          gap: space.lg,
          paddingBottom: insets.bottom + space.xxl,
        }}
      >
        {error ? <ErrorNotice message={error} /> : null}

        {hifz ? (
          <>
            <Card>
              <View style={{ alignItems: "center", gap: space.md, paddingVertical: space.sm }}>
                <ProgressRing value={hifz.percentComplete / 100} size={140} stroke={12}>
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ fontSize: 32, fontWeight: "700", color: palette.foreground }}>
                      {hifz.juzMemorized}
                    </Text>
                    <Text style={{ fontSize: 12, color: palette.muted, fontWeight: "600" }}>
                      JUZ
                    </Text>
                  </View>
                </ProgressRing>
                <Text style={{ color: palette.muted, fontSize: 14 }}>
                  {tm("pagesMemorised", { done: hifz.pagesMemorized, total: hifz.pagesTotal })}
                </Text>
              </View>
            </Card>

            <View style={{ gap: space.md }}>
              <SectionTitle>{tm("byGroup")}</SectionTitle>
              {hifz.groups.length === 0 ? (
                <EmptyState icon="hifz">
                  {tm("noHifz")}
                </EmptyState>
              ) : (
                hifz.groups.map((g) => (
                  <Card key={g.groupId}>
                    <View
                      style={{ flexDirection: "row", justifyContent: "space-between" }}
                    >
                      <Text style={{ color: palette.foreground, fontWeight: "600" }}>
                        {g.groupName ?? tm("groups")}
                      </Text>
                      <Text style={{ color: palette.accent, fontWeight: "700" }}>
                        {g.pagesMemorized} {tm("pages")}
                      </Text>
                    </View>
                    {g.notes ? (
                      <Text style={{ color: palette.muted, fontSize: 13, marginTop: 6 }}>
                        {g.notes}
                      </Text>
                    ) : null}
                    <Text style={{ color: palette.faint, fontSize: 12, marginTop: 8 }}>
                      Updated {formatDate(g.updatedAt, { day: "numeric", month: "short" })}
                    </Text>
                  </Card>
                ))
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
    </>
  );
}
