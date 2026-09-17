import { useCallback } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

import { api } from "@/lib/api";
import { useResource } from "@/lib/resource";
import { formatDate, tm } from "@/lib/i18n";
import type { ParentChild } from "@/lib/types";
import { Avatar, Card, EmptyState, ErrorNotice, FirstLoad } from "@/components/ui";
import { Icon } from "@/components/icon";
import { space, usePalette } from "@/theme";

/**
 * A parent's children.
 *
 * The list is deliberately kept even for a single child: it is where a parent
 * lands, and jumping straight into a detail screen would leave them with a
 * back button to nowhere and no way to see a second child was added later.
 */
export default function ChildrenScreen() {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const {
    data: children,
    error,
    refreshing,
    refresh,
  } = useResource<ParentChild[]>(
    "parent/children",
    useCallback(() => api<ParentChild[]>("/parent/children"), []),
    { fallbackError: tm("childrenLoadFailed") },
  );

  if (children === null) {
    return (
      <>
        <Stack.Screen options={{ title: tm("children") }} />
        <FirstLoad error={error} />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: tm("children") }} />
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

        {children.length === 0 ? (
          <EmptyState icon="children">{tm("noChildren")}</EmptyState>
        ) : (
          children.map((child, i) => (
            <Animated.View key={child.id} entering={FadeInDown.delay(i * 40).duration(220)}>
              <Card onPress={() => router.push(`/(app)/children/${child.id}`)}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
                  <Avatar name={child.fullName} size={44} />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ fontSize: 16, fontWeight: "700", color: palette.foreground }}
                    >
                      {child.fullName}
                    </Text>
                    {child.dateOfBirth ? (
                      <Text style={{ color: palette.muted, fontSize: 13, marginTop: 2 }}>
                        {formatDate(child.dateOfBirth)}
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
