import { useCallback } from "react";
import { Linking, ScrollView, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/lib/api";
import { useResource } from "@/lib/resource";
import { getLocale, tm } from "@/lib/i18n";
import type { LessonDetail } from "@/lib/types";
import { LessonBody } from "@/components/lesson-body";
import { LessonAudioPlayer } from "@/components/lesson-audio-player";
import { Card, EmptyState, FirstLoad, SectionTitle } from "@/components/ui";
import { Icon } from "@/components/icon";
import { space, usePalette } from "@/theme";

function humanSize(bytes: number | null): string | null {
  if (!bytes) return null;
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

export default function LessonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const palette = usePalette();
  const insets = useSafeAreaInsets();

  const { data: lesson, error } = useResource<LessonDetail>(
    id ? `student/lessons/${id}?locale=${getLocale()}` : null,
    useCallback(
      () => api<LessonDetail>(`/student/lessons/${id}`, { query: { locale: getLocale() } }),
      [id],
    ),
    {
      fallbackError: tm("lessonLoadFailed"),
      // `ttlMs: 0` — the cached body still renders instantly, but the signed
      // download URLs on it expire, so every visit refetches to replace them
      // (AGENTS.md §5). Caching them for 30s would hand the user dead links.
      ttlMs: 0,
    },
  );

  if (!lesson) {
    return (
      <>
        <Stack.Screen options={{ title: tm("lessons") }} />
        <FirstLoad error={error} />
      </>
    );
  }

  const blocks = Array.isArray(lesson.body) ? lesson.body : [];

  // Audio for this language: the track for the current locale, plus any base
  // tracks that apply to every language. Tracks for other locales stay hidden.
  const locale = getLocale();
  const audio = lesson.audio.filter(
    (a) => a.locale === null || a.locale === locale,
  );

  return (
    <>
      <Stack.Screen options={{ title: lesson.topic?.title ?? tm("lessons") }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: palette.background }}
        contentContainerStyle={{
          padding: space.xl,
          gap: space.xl,
          paddingBottom: insets.bottom + space.xxl,
        }}
      >
        <View style={{ gap: space.xs }}>
          {lesson.topic ? (
            <Text style={{ color: palette.accent, fontSize: 13, fontWeight: "700" }}>
              {lesson.topic.title}
            </Text>
          ) : null}
          <Text style={{ fontSize: 24, fontWeight: "700", color: palette.foreground }}>
            {lesson.title}
          </Text>
        </View>

        {blocks.length === 0 ? (
          <EmptyState icon="lessonPage">{tm("noContent")}</EmptyState>
        ) : (
          <LessonBody blocks={blocks} />
        )}

        {audio.length > 0 ? (
          <View style={{ gap: space.md }}>
            <SectionTitle>{tm("lessonAudio")}</SectionTitle>
            <LessonAudioPlayer tracks={audio} />
          </View>
        ) : null}

        {lesson.resources.length > 0 ? (
          <View style={{ gap: space.md }}>
            <SectionTitle>{tm("attachments")}</SectionTitle>
            {lesson.resources.map((r) => (
              <Card
                key={r.id}
                onPress={
                  // Signed URLs expire, so this opens the one fetched with the
                  // page rather than anything cached (AGENTS.md §5).
                  r.signedUrl ? () => void Linking.openURL(r.signedUrl!) : undefined
                }
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
                  <Icon name="attachment" size={20} color={palette.accent} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: palette.foreground, fontWeight: "600" }}>
                      {r.title}
                    </Text>
                    {humanSize(r.sizeBytes) ? (
                      <Text style={{ color: palette.muted, fontSize: 12, marginTop: 2 }}>
                        {humanSize(r.sizeBytes)}
                      </Text>
                    ) : null}
                  </View>
                  {r.signedUrl ? (
                    <Text style={{ color: palette.faint, fontSize: 18 }}>↗</Text>
                  ) : null}
                </View>
              </Card>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </>
  );
}
