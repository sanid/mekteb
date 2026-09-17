import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";

import type { LessonAudio } from "@/lib/types";
import { tm } from "@/lib/i18n";
import { Icon } from "@/components/icon";
import { radius, space, usePalette } from "@/theme";

/**
 * Plays the lesson's audio tracks — one native player, one track at a time.
 *
 * The lesson may carry several recordings (one per language plus a base one);
 * tapping a track plays it, tapping it again pauses. The signed URLs come
 * fresh from the detail fetch (they expire, so the screen refetches on every
 * visit — see `lessons/[id].tsx`), and a stalled source gives up after a
 * timeout rather than leaving the spinner forever.
 */

/** How long a track may take to load before we call it a failure. */
const LOAD_TIMEOUT_MS = 12_000;

function formatDuration(totalSeconds: number | null): string | null {
  if (totalSeconds == null || !Number.isFinite(totalSeconds)) return null;
  const m = Math.floor(totalSeconds / 60);
  const s = Math.round(totalSeconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function LessonAudioPlayer({ tracks }: { tracks: LessonAudio[] }) {
  const palette = usePalette();
  const player = useAudioPlayer(undefined, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);

  const [currentId, setCurrentId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The ringer switch must not mute a lesson a student is trying to listen to.
  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true }).catch(() => {
      // A device that refuses the audio session still plays through the
      // speaker when the ringer is on — not worth an error banner.
    });
  }, []);

  // Release the native player with the screen (expo-audio owns the lifecycle;
  // stopping playback is the app's part of it).
  useEffect(() => {
    return () => {
      if (errorTimer.current) clearTimeout(errorTimer.current);
      player.release?.();
    };
  }, [player]);

  const clearErrorTimer = () => {
    if (errorTimer.current) {
      clearTimeout(errorTimer.current);
      errorTimer.current = null;
    }
  };

  const toggle = useCallback(
    (track: LessonAudio) => {
      if (!track.signedUrl) return;
      if (currentId === track.id) {
        if (status.playing) player.pause();
        else player.play();
        return;
      }
      clearErrorTimer();
      setErrorId(null);
      setCurrentId(track.id);
      player.replace(track.signedUrl);
      player.play();
      errorTimer.current = setTimeout(() => {
        // Loaded but silent (paused) is fine; only a track that never arrived
        // should give up and show its retry affordance.
        if (currentId === track.id && !status.isLoaded) {
          setErrorId(track.id);
        }
      }, LOAD_TIMEOUT_MS);
    },
    [currentId, player, status.isLoaded, status.playing],
  );

  return (
    <View style={{ gap: space.sm }}>
      {tracks.map((track) => {
        const isCurrent = currentId === track.id;
        const isLoading = isCurrent && !status.isLoaded && errorId !== track.id;
        const isPlaying = isCurrent && status.playing;
        const failed = errorId === track.id;

        return (
          <Pressable
            key={track.id}
            onPress={() => toggle(track)}
            disabled={!track.signedUrl}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: space.md,
              padding: space.md,
              borderRadius: radius.md,
              backgroundColor: isCurrent ? palette.accentSubtle : palette.surface,
              borderWidth: 1,
              borderColor: isCurrent ? palette.accent : palette.cardBorder,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: radius.sm,
                backgroundColor: palette.accent,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Icon
                  name={isPlaying ? "pause" : "play"}
                  size={16}
                  color="#fff"
                />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text
                numberOfLines={1}
                style={{ color: palette.foreground, fontWeight: "600", fontSize: 14 }}
              >
                {track.title}
              </Text>
              <Text style={{ color: palette.muted, fontSize: 12, marginTop: 2 }}>
                {failed
                  ? tm("audioLoadFailed")
                  : formatDuration(track.durationSeconds) ?? track.mimeType ?? ""}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
