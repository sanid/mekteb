import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { api, ApiError } from "@/lib/api";
import { invalidate } from "@/lib/resource";
import { tm } from "@/lib/i18n";
import {
  fetchSurah,
  translationForLocale,
  RECITERS,
  type SavedAyah,
  type SurahData,
} from "@/lib/quran";
import {
  PLAYBACK_RATES,
  REPEAT_MODES,
  SLEEP_OPTIONS,
  useRecitation,
  type RepeatMode,
} from "@/lib/quran-audio";
import { Icon, type IconName } from "@/components/icon";
import { Avatar, ErrorNotice, Loading } from "@/components/ui";
import { radius, space, useArabicFont, usePalette } from "@/theme";

/**
 * One surah: Arabic with translation beneath, a per-ayah bookmark, and
 * recitation.
 *
 * Audio plays ayah by ayah and advances on its own (see `useRecitation`), with
 * the playing ayah highlighted so someone following along keeps their place.
 *
 * Bookmarks carry the ayah text with them (the API stores it on the row), so
 * the saved list renders without re-fetching scripture.
 */
const SIZES = [17, 20, 24, 28] as const;

export default function SurahScreen() {
  const { surah } = useLocalSearchParams<{ surah: string }>();
  const number = Number(surah);
  const palette = usePalette();
  const arabicFont = useArabicFont();
  const insets = useSafeAreaInsets();

  const [data, setData] = useState<{ arabic: SurahData; translation: SurahData } | null>(null);
  const [saved, setSaved] = useState<Map<number, string>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [sizeIndex, setSizeIndex] = useState(1);
  const [showTranslation, setShowTranslation] = useState(true);
  // Ayah numbers with a bookmark request in flight — guards double-taps so two
  // races cannot overwrite each other. It is a guard, not a spinner: the icon
  // flips optimistically and the request reconciles behind it.
  const [saving, setSaving] = useState<Set<number>>(new Set());

  const [audioSheetOpen, setAudioSheetOpen] = useState(false);

  const edition = useMemo(() => translationForLocale(), []);

  // Recitation is keyed on the *global* ayah numbers, which is what the CDN
  // files are named after; `numberInSurah` would fetch the wrong verse.
  const ayahNumbers = useMemo(
    () => data?.arabic.ayahs.map((a) => a.number) ?? [],
    [data],
  );
  const audio = useRecitation(ayahNumbers);

  const load = useCallback(async () => {
    if (!Number.isFinite(number)) return;
    setError(null);
    try {
      setData(await fetchSurah(number, edition));
    } catch {
      setError(tm("surahFailed"));
    }

    // Bookmarks are a separate concern: failing to load them must not stop
    // the text from rendering.
    try {
      const rows = await api<SavedAyah[]>("/quran/saved-ayahs");
      setSaved(
        new Map(
          rows.filter((r) => r.surahNumber === number).map((r) => [r.ayahNumber, r.id]),
        ),
      );
    } catch {
      // Leaving the map empty just means the bookmark icons read as "unsaved".
    }
  }, [number, edition]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const toggleSave = async (ayahNumber: number) => {
    if (!data || saving.has(ayahNumber)) return;
    const existingId = saved.get(ayahNumber);
    setSaving((s) => new Set(s).add(ayahNumber));

    // Optimistic flip: the bookmark icon reacts to the tap, the request runs
    // behind it. A failure reverts exactly what this tap changed.
    if (existingId) {
      setSaved((m) => {
        const next = new Map(m);
        next.delete(ayahNumber);
        return next;
      });
    } else {
      // Placeholder id until the server returns the real row id; the saved
      // list is a separate screen with its own cache, so this never leaks.
      setSaved((m) => new Map(m).set(ayahNumber, `pending-${ayahNumber}`));
    }

    try {
      if (existingId) {
        await api(`/quran/saved-ayahs/${existingId}`, { method: "DELETE" });
      } else {
        const arabicAyah = data.arabic.ayahs.find((a) => a.numberInSurah === ayahNumber);
        const translationAyah = data.translation.ayahs.find(
          (a) => a.numberInSurah === ayahNumber,
        );
        const created = await api<{ id: string | null }>("/quran/saved-ayahs", {
          method: "POST",
          body: {
            surahNumber: number,
            ayahNumber,
            surahName: data.arabic.englishName,
            arabicText: arabicAyah?.text ?? "",
            translationText: translationAyah?.text,
            translationEdition: edition,
          },
        });
        // Swap the placeholder for the real id (or drop it if the server
        // returned none — the verse just reads as unsaved again).
        setSaved((m) => {
          const next = new Map(m);
          next.delete(ayahNumber);
          if (created.id) next.set(ayahNumber, created.id!);
          return next;
        });
      }
      // The saved-verses list is a different screen with its own cache.
      invalidate("quran/saved-ayahs");
      void Haptics.selectionAsync();
    } catch (e) {
      // Revert the optimistic flip.
      if (existingId) {
        setSaved((m) => new Map(m).set(ayahNumber, existingId));
      } else {
        setSaved((m) => {
          const next = new Map(m);
          next.delete(ayahNumber);
          return next;
        });
      }
      setError(e instanceof ApiError ? e.message : tm("saveAyahFailed"));
    } finally {
      setSaving((s) => {
        const next = new Set(s);
        next.delete(ayahNumber);
        return next;
      });
    }
  };

  if (!data && !error) {
    return (
      <>
        <Stack.Screen options={{ title: tm("quran") }} />
        <Loading />
      </>
    );
  }

  const arabicSize = SIZES[sizeIndex];

  const currentReciter =
    RECITERS.find((r) => r.id === audio.reciterId) ?? RECITERS[0];
  const reciterName = currentReciter.name;
  const reciterImage = currentReciter.image;

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <Stack.Screen options={{ title: data?.arabic.englishName ?? tm("quran") }} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: space.xl,
          gap: space.md,
          // Room for the player bar, which floats over the end of the text.
          paddingBottom:
            insets.bottom + (audio.currentAyah !== null ? 96 : space.xxl),
        }}
      >
        {error ? <ErrorNotice message={error} /> : null}
        {audio.error ? <ErrorNotice message={audio.error} /> : null}

        {data ? (
          <>
            {/* Reading controls, not settings — they live with the text. */}
            <View style={{ flexDirection: "row", gap: space.sm, alignItems: "center" }}>
              <Control
                label="A−"
                onPress={() => setSizeIndex((i) => Math.max(0, i - 1))}
                disabled={sizeIndex === 0}
              />
              <Control
                label="A+"
                onPress={() => setSizeIndex((i) => Math.min(SIZES.length - 1, i + 1))}
                disabled={sizeIndex === SIZES.length - 1}
              />
              <View style={{ flex: 1 }} />
              <Control
                label={showTranslation ? tm("hideTranslation") : tm("showTranslation")}
                onPress={() => setShowTranslation((v) => !v)}
              />
            </View>

            {/* Starting from the top is its own action: the per-ayah buttons
                cover "read this verse again", not "recite the surah to me". */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
              <Control
                label={tm("playSurah")}
                icon="play"
                onPress={() => audio.togglePlayback()}
                disabled={audio.currentAyah !== null}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={tm("audio")}
                onPress={() => setAudioSheetOpen(true)}
                style={({ pressed }) => ({
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: space.sm,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                {reciterImage ? (
                  <Image
                    source={reciterImage}
                    accessibilityIgnoresInvertColors
                    style={{ width: 26, height: 26, borderRadius: 13, resizeMode: "cover" }}
                  />
                ) : null}
                <Text
                  numberOfLines={1}
                  style={{ color: palette.accent, fontSize: 13, fontWeight: "700" }}
                >
                  {reciterName}
                </Text>
              </Pressable>
            </View>

            <Text style={{ color: palette.faint, fontSize: 12 }}>
              {data.arabic.englishNameTranslation} ·{" "}
              {tm("ayahCount", { count: data.arabic.numberOfAyahs })}
            </Text>

            {data.arabic.ayahs.map((ayah) => {
              const translation = data.translation.ayahs.find(
                (a) => a.numberInSurah === ayah.numberInSurah,
              );
              const isSaved = saved.has(ayah.numberInSurah);
              const isCurrent = audio.currentAyah === ayah.number;

              return (
                <View
                  key={ayah.number}
                  style={{
                    paddingVertical: space.lg,
                    paddingHorizontal: isCurrent ? space.md : 0,
                    marginHorizontal: isCurrent ? -space.md : 0,
                    borderRadius: isCurrent ? radius.md : 0,
                    // The playing ayah is tinted rather than outlined: someone
                    // reciting along needs to find their line at a glance,
                    // from a phone lying flat on a table.
                    backgroundColor: isCurrent ? palette.accentSubtle : "transparent",
                    borderBottomWidth: 1,
                    borderBottomColor: palette.cardBorder,
                    gap: space.sm,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
                    <Text style={{ color: palette.accent, fontWeight: "700", fontSize: 12 }}>
                      {number}:{ayah.numberInSurah}
                    </Text>
                    <View style={{ flex: 1 }} />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        isCurrent && audio.playing ? tm("pauseAyah") : tm("playAyah")
                      }
                      accessibilityState={{
                        selected: isCurrent,
                        busy: isCurrent && audio.loading,
                      }}
                      onPress={() => audio.toggleAyah(ayah.number)}
                      hitSlop={10}
                      style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
                    >
                      {isCurrent && audio.loading ? (
                        <ActivityIndicator color={palette.accent} />
                      ) : (
                        <Icon
                          name={isCurrent && audio.playing ? "pause" : "play"}
                          size={17}
                          color={isCurrent ? palette.accent : palette.faint}
                        />
                      )}
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={isSaved ? tm("removeAyah") : tm("saveAyah")}
                      accessibilityState={{ selected: isSaved, busy: saving.has(ayah.numberInSurah) }}
                      onPress={() => toggleSave(ayah.numberInSurah)}
                      hitSlop={10}
                      style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
                    >
                      <Icon
                        name={isSaved ? "bookmarkOn" : "bookmark"}
                        size={18}
                        color={isSaved ? palette.accent : palette.faint}
                      />
                    </Pressable>
                  </View>

                  {/*
                    `writingDirection` matters as much as alignment: without it
                    trailing punctuation and the ayah marker land on the wrong
                    side of the line.
                  */}
                  <Text
                    style={{
                      fontFamily: arabicFont,
                      fontSize: arabicSize,
                      lineHeight: arabicSize * 1.9,
                      color: palette.foreground,
                      textAlign: "right",
                      writingDirection: "rtl",
                    }}
                  >
                    {ayah.text}
                  </Text>

                  {showTranslation && translation ? (
                    <Text
                      style={{
                        fontSize: 14,
                        lineHeight: 22,
                        color: palette.muted,
                      }}
                    >
                      {translation.text}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </>
        ) : null}
      </ScrollView>

      {audio.currentAyah !== null ? (
        <PlayerBar
          label={`${number}:${
            data?.arabic.ayahs.find((a) => a.number === audio.currentAyah)
              ?.numberInSurah ?? ""
          } · ${reciterName}`}
          playing={audio.playing}
          loading={audio.loading}
          sleepRemaining={audio.sleepRemaining}
          onToggle={audio.togglePlayback}
          onStop={audio.stop}
        />
      ) : null}

      <AudioSettingsSheet
        open={audioSheetOpen}
        selected={audio.reciterId}
        onSelect={(id) => {
          audio.setReciter(id);
        }}
        repeatMode={audio.repeatMode}
        onRepeatMode={(mode) => audio.setRepeatMode(mode)}
        playbackRate={audio.playbackRate}
        onPlaybackRate={(rate) => audio.setPlaybackRate(rate)}
        sleepMinutes={audio.sleepMinutes}
        onSleepMinutes={(minutes) => audio.setSleepMinutes(minutes)}
        onClose={() => setAudioSheetOpen(false)}
      />
    </View>
  );
}

/**
 * Sticky transport, shown only while something is loaded. It floats over the
 * text instead of pushing it: the reader is the screen, the player is not.
 */
function PlayerBar({
  label,
  playing,
  loading,
  sleepRemaining,
  onToggle,
  onStop,
}: {
  label: string;
  playing: boolean;
  loading: boolean;
  /** Milliseconds left on the sleep timer — shown while it runs. */
  sleepRemaining: number | null;
  onToggle: () => void;
  onStop: () => void;
}) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        paddingHorizontal: space.lg,
        paddingTop: space.md,
        paddingBottom: insets.bottom || space.md,
        backgroundColor: palette.surface,
        borderTopWidth: 1,
        borderTopColor: palette.cardBorder,
      }}
    >
      <Text numberOfLines={1} style={{ flex: 1, color: palette.muted, fontSize: 13 }}>
        {label}
      </Text>
      {sleepRemaining != null ? (
        // `fontVariant: ["tabular-nums"]` is iOS-only; on Android the digits
        // have different widths and the countdown visibly jitters as it runs.
        // A monospace family gives Android the same effect (see calendar.tsx).
        <Text
          style={{
            color: palette.faint,
            fontSize: 12,
            fontVariant: ["tabular-nums"],
            fontFamily: Platform.select({ android: "monospace", default: undefined }),
          }}
        >
          {Math.floor(sleepRemaining / 60000)}:
          {String(Math.floor((sleepRemaining % 60000) / 1000)).padStart(2, "0")}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={playing ? tm("pauseAyah") : tm("playAyah")}
        onPress={onToggle}
        hitSlop={10}
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
      >
        {loading ? (
          <ActivityIndicator color={palette.accent} />
        ) : (
          <Icon name={playing ? "pause" : "play"} size={20} color={palette.accent} />
        )}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={tm("stopAudio")}
        onPress={onStop}
        hitSlop={10}
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
      >
        <Text style={{ fontSize: 18, color: palette.faint }}>■</Text>
      </Pressable>
    </View>
  );
}

/**
 * The audio settings sheet: reciter list plus the playback controls the web
 * reader has (repeat mode, speed, sleep timer) — web-reader parity, open.md
 * §3.1. The controls live here, not in the header, so the reading surface
 * stays uncluttered.
 */
function AudioSettingsSheet({
  open,
  selected,
  onSelect,
  repeatMode,
  onRepeatMode,
  playbackRate,
  onPlaybackRate,
  sleepMinutes,
  onSleepMinutes,
  onClose,
}: {
  open: boolean;
  selected: string;
  onSelect: (id: string) => void;
  repeatMode: RepeatMode;
  onRepeatMode: (mode: RepeatMode) => void;
  playbackRate: number;
  onPlaybackRate: (rate: number) => void;
  sleepMinutes: number;
  onSleepMinutes: (minutes: number) => void;
  onClose: () => void;
}) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const repeatLabel: Record<RepeatMode, string> = {
    off: tm("repeatOff"),
    ayah: tm("repeatAyah"),
    surah: tm("repeatSurah"),
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={tm("close")}
        onPress={onClose}
        style={{ flex: 1, backgroundColor: "rgba(28,36,32,0.4)", justifyContent: "flex-end" }}
      >
        {/* An inner Pressable that swallows the tap, so choosing an option
            does not also dismiss through the backdrop underneath. */}
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor: palette.background,
            borderTopLeftRadius: radius.sheet,
            borderTopRightRadius: radius.sheet,
            paddingTop: space.lg,
            paddingBottom: insets.bottom + space.lg,
            paddingHorizontal: space.xl,
            maxHeight: "85%",
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: palette.foreground,
              marginBottom: space.sm,
            }}
          >
            {tm("audio")}
          </Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* ── Playback controls ── */}
            <Text style={sectionHeader(palette.muted)}>{tm("playback")}</Text>

            <SegmentedRow
              label={tm("repeat")}
              options={REPEAT_MODES.map((m) => ({ value: m, label: repeatLabel[m] }))}
              selected={repeatMode}
              onSelect={(v) => onRepeatMode(v as RepeatMode)}
            />
            <SegmentedRow
              label={tm("speed")}
              options={PLAYBACK_RATES.map((r) => ({ value: String(r), label: `${r}×` }))}
              selected={String(playbackRate)}
              onSelect={(v) => onPlaybackRate(Number(v))}
            />
            <SegmentedRow
              label={tm("sleepTimer")}
              options={SLEEP_OPTIONS.map((m) => ({
                value: String(m),
                label: m === 0 ? tm("sleepOff") : `${m}m`,
              }))}
              selected={String(sleepMinutes)}
              onSelect={(v) => onSleepMinutes(Number(v))}
            />

            {/* ── Reciter ── */}
            <Text style={[sectionHeader(palette.muted), { marginTop: space.md }]}>
              {tm("reciter")}
            </Text>
            {RECITERS.map((reciter) => {
              const active = reciter.id === selected;
              return (
                <Pressable
                  key={reciter.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => onSelect(reciter.id)}
                  style={({ pressed }) => ({
                    paddingVertical: space.sm + 2,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: space.md,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  {/* `cover` on a fixed square: the portraits are not all the
                      same aspect ratio (72–164px tall), and `contain` would
                      letterbox the short ones inside the circle. */}
                  {reciter.image ? (
                    <Image
                      source={reciter.image}
                      accessibilityIgnoresInvertColors
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        resizeMode: "cover",
                        borderWidth: active ? 2 : 0,
                        borderColor: palette.accent,
                      }}
                    />
                  ) : (
                    <Avatar name={reciter.name} size={44} />
                  )}
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 15,
                      fontWeight: active ? "800" : "600",
                      color: active ? palette.accent : palette.foreground,
                    }}
                  >
                    {reciter.name}
                  </Text>
                  {active ? (
                    <Icon name="done" size={17} color={palette.accent} />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function sectionHeader(color: string) {
  return {
    fontSize: 12,
    fontWeight: "700" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    color,
    marginBottom: space.xs,
  };
}

/** One labelled row of selectable pills — repeat, speed, sleep timer. */
function SegmentedRow<T extends string>({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
}) {
  const palette = usePalette();
  return (
    <View style={{ marginBottom: space.sm }}>
      <Text style={{ fontSize: 13, fontWeight: "600", color: palette.muted, marginBottom: 6 }}>
        {label}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {options.map((opt) => {
          const active = opt.value === selected;
          return (
            <Pressable
              key={opt.value}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onSelect(opt.value)}
              style={({ pressed }) => ({
                paddingHorizontal: space.md,
                paddingVertical: 6,
                borderRadius: radius.sm,
                borderWidth: 1,
                borderColor: active ? palette.accent : palette.cardBorder,
                backgroundColor: active ? palette.accentSubtle : palette.card,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: active ? palette.accent : palette.foreground,
                }}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Control({
  label,
  icon,
  onPress,
  disabled = false,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  disabled?: boolean;
}) {
  const palette = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: space.md,
        paddingVertical: space.sm,
        borderRadius: radius.sm,
        borderWidth: 1,
        borderColor: palette.cardBorder,
        backgroundColor: palette.card,
        opacity: disabled ? 0.4 : pressed ? 0.6 : 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
      })}
    >
      {icon ? <Icon name={icon} size={14} color={palette.accent} /> : null}
      <Text style={{ fontSize: 13, fontWeight: "700", color: palette.foreground }}>
        {label}
      </Text>
    </Pressable>
  );
}
