import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { api, ApiError } from "@/lib/api";
import { invalidate, useResource } from "@/lib/resource";
import { formatDate, tm } from "@/lib/i18n";
import type { SavedAyah } from "@/lib/quran";
import { Card, EmptyState, ErrorNotice, FirstLoad, SectionTitle } from "@/components/ui";
import { Icon } from "@/components/icon";
import { space, useArabicFont, usePalette } from "@/theme";

/**
 * Bookmarked ayahs, across all surahs.
 *
 * Each row stores its own Arabic and translation text (the API writes them on
 * save), so this list never re-fetches scripture — it renders from the row
 * alone, which is also what makes it usable on a bad connection.
 */
export default function SavedAyahsScreen() {
  const palette = usePalette();
  const arabicFont = useArabicFont();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [removing, setRemoving] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data: items,
    error: loadError,
    refreshing,
    refresh,
    set,
  } = useResource<SavedAyah[]>(
    "quran/saved-ayahs",
    useCallback(() => api<SavedAyah[]>("/quran/saved-ayahs"), []),
    { fallbackError: tm("savedAyahsFailed") },
  );

  const error = actionError ?? loadError;

  const remove = async (id: string) => {
    if (removing) return;
    setRemoving(id);
    try {
      await api(`/quran/saved-ayahs/${id}`, { method: "DELETE" });
      void Haptics.selectionAsync();
      set((list) => (list ?? []).filter((x) => x.id !== id));
      // The reader keeps its own copy of which ayahs are bookmarked.
      invalidate("quran/");
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : tm("saveAyahFailed"));
    } finally {
      setRemoving(null);
    }
  };

  if (items === null) {
    return (
      <>
        <Stack.Screen options={{ title: tm("savedAyahs") }} />
        <FirstLoad error={error} />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: tm("savedAyahs") }} />
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

        {items.length === 0 ? (
          <EmptyState icon="bookmark">{tm("noSavedAyahs")}</EmptyState>
        ) : (
          <>
            <SectionTitle>{tm("savedAyahs")}</SectionTitle>
            {items.map((item) => (
              <Card
                key={item.id}
                onPress={() => router.push(`/(app)/quran/${item.surahNumber}`)}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={{ color: palette.accent, fontWeight: "700", fontSize: 12 }}>
                    {item.surahName} {item.surahNumber}:{item.ayahNumber}
                  </Text>
                  <View style={{ flex: 1 }} />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={tm("removeAyah")}
                    onPress={() => remove(item.id)}
                    hitSlop={10}
                    style={({ pressed }) => ({ opacity: pressed || removing === item.id ? 0.4 : 1 })}
                  >
                    <Icon name="remove" size={17} color={palette.danger} />
                  </Pressable>
                </View>

                <Text
                  style={{
                    fontFamily: arabicFont,
                    fontSize: 18,
                    lineHeight: 38,
                    color: palette.foreground,
                    textAlign: "right",
                    writingDirection: "rtl",
                    marginTop: space.sm,
                  }}
                >
                  {item.arabicText}
                </Text>

                {item.translationText ? (
                  <Text
                    style={{ fontSize: 14, lineHeight: 22, color: palette.muted, marginTop: space.sm }}
                  >
                    {item.translationText}
                  </Text>
                ) : null}

                {item.note ? (
                  <Text style={{ fontSize: 13, color: palette.info, marginTop: space.sm }}>
                    {item.note}
                  </Text>
                ) : null}

                <Text style={{ color: palette.faint, fontSize: 12, marginTop: space.sm }}>
                  {formatDate(item.createdAt, { day: "numeric", month: "long" })}
                </Text>
              </Card>
            ))}
          </>
        )}
      </ScrollView>
    </>
  );
}
