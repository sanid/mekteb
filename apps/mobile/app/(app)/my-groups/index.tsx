import { useCallback } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

import { api } from "@/lib/api";
import { useResource } from "@/lib/resource";
import { tm } from "@/lib/i18n";
import type { StudentGroup } from "@/lib/types";
import { Card, EmptyState, ErrorNotice, FirstLoad, SectionTitle } from "@/components/ui";
import { Icon } from "@/components/icon";
import { radius, space, usePalette } from "@/theme";

/**
 * The student's groups — the mobile counterpart of the group cards on the
 * web student home. Each opens a detail page with upcoming lessons, the
 * teacher's weekly summaries and progress notes.
 */
export default function MyGroupsScreen() {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data, error, refreshing, refresh } = useResource<StudentGroup[]>(
    "student/groups",
    useCallback(() => api<StudentGroup[]>("/student/groups"), []),
    { fallbackError: tm("groupLoadFailed") },
  );

  if (data === null) {
    return (
      <>
        <Stack.Screen options={{ title: tm("myGroups") }} />
        <FirstLoad error={error} />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: tm("myGroups") }} />
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

        <SectionTitle>{tm("myGroups")}</SectionTitle>

        {data.length === 0 ? (
          <EmptyState icon="groups">{tm("noGroups")}</EmptyState>
        ) : (
          data.map((g, i) => (
            <Animated.View
              key={g.id}
              entering={FadeInDown.delay(Math.min(i * 40, 240)).duration(220)}
            >
              <Card onPress={() => router.push(`/(app)/my-groups/${g.id}`)}>
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
                    <Text style={{ fontSize: 16, fontWeight: "700", color: palette.foreground }}>
                      {g.name}
                    </Text>
                    {g.room ? (
                      <Text style={{ color: palette.muted, fontSize: 13, marginTop: 2 }}>
                        {tm("groupRoom")}: {g.room}
                      </Text>
                    ) : null}
                  </View>
                  <Icon name="chevron" size={18} color={palette.faint} />
                </View>
              </Card>
            </Animated.View>
          ))
        )}
      </ScrollView>
    </>
  );
}
