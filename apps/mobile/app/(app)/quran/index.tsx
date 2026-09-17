import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/lib/api";
import { useResource } from "@/lib/resource";
import { hasPlugin } from "@/lib/session";
import { useSession } from "@/lib/session-context";
import { fetchSurahList, type SurahMeta } from "@/lib/quran";
import { tm } from "@/lib/i18n";
import {
  Card,
  ErrorNotice,
  FirstLoad,
  IconTitle,
  ProgressRing,
  SectionTitle,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { radius, space, useArabicFont, usePalette } from "@/theme";

type Hifz = { juzMemorized: number; percentComplete: number };

/**
 * The Quran tab: all 114 surahs, with hifz progress and saved ayahs above them.
 *
 * The list is scripture metadata, so it is fetched from alquran.cloud rather
 * than `/api/v1` and does not depend on a mosque or a plugin — the reader
 * works for anyone signed in. Hifz progress is the part that is gated, since
 * only a mosque running that plugin records it.
 */
export default function QuranIndexScreen() {
  const palette = usePalette();
  const arabicFont = useArabicFont();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useSession();

  const [query, setQuery] = useState("");
  const wantsHifz = hasPlugin(session, "quran_hifz");

  const { data: surahs, error } = useResource<SurahMeta[]>(
    "quran/surahs",
    useCallback(() => fetchSurahList(), []),
    { fallbackError: tm("surahListFailed") },
  );

  /**
   * Hifz is a separate resource so a failure there cannot blank the reader —
   * and a teacher, who has no hifz record of their own, simply gets nothing.
   */
  const { data: hifz } = useResource<Hifz | null>(
    wantsHifz ? "student/hifz" : null,
    useCallback(() => api<Hifz>("/student/hifz").catch(() => null), []),
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return surahs ?? [];
    return (surahs ?? []).filter(
      (s) =>
        s.englishName.toLowerCase().includes(q) ||
        s.englishNameTranslation.toLowerCase().includes(q) ||
        s.name.includes(query.trim()) ||
        String(s.number) === q,
    );
  }, [surahs, query]);

  if (surahs === null) {
    return (
      <>
        <Stack.Screen options={{ title: tm("quran") }} />
        <FirstLoad error={error} />
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
          gap: space.md,
          paddingBottom: insets.bottom + space.xxl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {error ? <ErrorNotice message={error} /> : null}

        {hifz ? (
          <Card onPress={() => router.push("/(app)/quran/hifz")}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.lg }}>
              <ProgressRing value={hifz.percentComplete / 100} size={56} stroke={6}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: palette.foreground }}>
                  {hifz.percentComplete}%
                </Text>
              </ProgressRing>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "700", color: palette.foreground }}>
                  {tm("hifz")}
                </Text>
                <Text style={{ color: palette.muted, fontSize: 13, marginTop: 2 }}>
                  {hifz.juzMemorized} {tm("juz")}
                </Text>
              </View>
              <Icon name="chevron" size={18} color={palette.faint} />
            </View>
          </Card>
        ) : null}

        <Card onPress={() => router.push("/(app)/quran/saved")}>
          <IconTitle icon="bookmark">{tm("savedAyahs")}</IconTitle>
        </Card>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={tm("searchSurah")}
          placeholderTextColor={palette.faint}
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            borderWidth: 1,
            borderColor: palette.cardBorder,
            backgroundColor: palette.card,
            color: palette.foreground,
            borderRadius: radius.md,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 16,
            marginTop: space.sm,
          }}
        />

        <SectionTitle>{tm("surahs")}</SectionTitle>

        {filtered.map((s) => (
          <Pressable
            key={s.number}
            accessibilityRole="button"
            accessibilityLabel={`${s.number}. ${s.englishName}`}
            onPress={() => router.push(`/(app)/quran/${s.number}`)}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: space.md,
              padding: space.md,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: palette.cardBorder,
              backgroundColor: palette.card,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: radius.sm,
                backgroundColor: palette.accentSubtle,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "700", color: palette.accent }}>
                {s.number}
              </Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700", color: palette.foreground }}>
                {s.englishName}
              </Text>
              <Text style={{ color: palette.muted, fontSize: 12, marginTop: 1 }}>
                {s.englishNameTranslation} · {tm("ayahCount", { count: s.numberOfAyahs })}
              </Text>
            </View>

            {/* Arabic name, right-aligned — it reads right-to-left. */}
            <Text style={{ fontFamily: arabicFont, fontSize: 18, color: palette.foreground }}>
              {s.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </>
  );
}
