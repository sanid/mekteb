import { useCallback, useEffect, useRef } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

import { api } from "@/lib/api";
import { useResource } from "@/lib/resource";
import { prefetchLessonText } from "@/lib/lessons-cache";
import { getLocale, tm } from "@/lib/i18n";
import type { LessonTopic } from "@/lib/types";
import { Card, EmptyState, ErrorNotice, FirstLoad, SectionTitle } from "@/components/ui";
import { Icon } from "@/components/icon";
import { radius, space, usePalette } from "@/theme";

export default function LessonsScreen() {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const {
    data: topics,
    error,
    refreshing,
    refresh,
  } = useResource<LessonTopic[]>(
    // The locale is part of the key: switching language must not reuse rows
    // fetched for the previous one.
    `student/lessons?locale=${getLocale()}`,
    useCallback(
      // Sending the locale gets translated titles where a mosque has them.
      () => api<LessonTopic[]>("/student/lessons", { query: { locale: getLocale() } }),
      [],
    ),
    { fallbackError: tm("lessonsLoadFailed") },
  );

  // Silently back-fill the per-lesson text cache once the list is here, so
  // opening any lesson shows its body instantly (see lessons-cache.ts).
  const prefetchedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!topics) return;
    const key = `lessons-list:${getLocale()}`;
    if (prefetchedFor.current === key) return;
    prefetchedFor.current = key;
    void prefetchLessonText();
  }, [topics]);

  if (topics === null) {
    return (
      <>
        <Stack.Screen options={{ title: tm("lessons") }} />
        <FirstLoad error={error} />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: tm("lessons") }} />
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

        {topics.length === 0 ? (
          <EmptyState icon="lessons">{tm("noLessons")}</EmptyState>
        ) : (
          topics.map((topic, ti) => (
            <View key={topic.id ?? "untopiced"} style={{ gap: space.md }}>
              <SectionTitle>{topic.title ?? tm("otherTopic")}</SectionTitle>
              {topic.lessons.map((lesson, li) => (
                <Animated.View
                  key={lesson.id}
                  entering={FadeInDown.delay(Math.min((ti * 3 + li) * 30, 260)).duration(220)}
                >
                  <Card onPress={() => router.push(`/(app)/lessons/${lesson.id}`)}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: radius.sm,
                          backgroundColor: palette.accentSubtle,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Icon name="lessonPage" size={16} color={palette.accent} />
                      </View>
                      <Text
                        style={{
                          flex: 1,
                          fontSize: 15,
                          fontWeight: "600",
                          color: palette.foreground,
                        }}
                      >
                        {lesson.title}
                      </Text>
                      <Icon name="chevron" size={16} color={palette.faint} />
                    </View>
                  </Card>
                </Animated.View>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </>
  );
}
