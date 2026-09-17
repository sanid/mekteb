import { useCallback, useEffect, useRef, useState } from "react";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";

import { audioUrlsForAyah, DEFAULT_RECITER, RECITERS } from "./quran";
import { getPref, PREF_RATE, PREF_RECITER, PREF_REPEAT, setPref } from "./prefs";
import { tm } from "./i18n";

/**
 * Recitation playback for one surah.
 *
 * Everything about the audio lives here rather than in the screen: the reader
 * is already a long component, and playback is the part with the ugly state —
 * a source that has to be swapped per ayah, an end-of-track event that has to
 * advance the position, and a load that can silently never arrive.
 *
 * One player instance is reused for the whole surah (`replace`), not one per
 * ayah: a 286-ayah surah would otherwise hold 286 native players.
 */

/** How long a track may take to load before we call it a failure. */
const LOAD_TIMEOUT_MS = 12_000;

/** Web-reader parity (open.md §3.1): the same repeat choices the web app has. */
export type RepeatMode = "off" | "ayah" | "surah";
export const REPEAT_MODES: RepeatMode[] = ["off", "ayah", "surah"];
/** Web-reader parity: same speeds as `QuranSettingsPanel` on the web. */
export const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2] as const;
/** Sleep timer choices, mirroring the web reader's SLEEP_OPTIONS. */
export const SLEEP_OPTIONS = [0, 5, 10, 15, 30, 60] as const;

export type Recitation = {
  /** Global ayah number (1…6236) currently loaded, or `null` when stopped. */
  currentAyah: number | null;
  playing: boolean;
  /** True while the current ayah is fetching — the button should not lie. */
  loading: boolean;
  error: string | null;
  reciterId: string;
  setReciter: (id: string) => void;
  /** off = play through once; ayah = repeat the current ayah; surah = loop. */
  repeatMode: RepeatMode;
  setRepeatMode: (mode: RepeatMode) => void;
  /** 0.75× … 2×, applied live to the native player. */
  playbackRate: number;
  setPlaybackRate: (rate: number) => void;
  /** Minutes until playback stops, or 0 for no timer. */
  sleepMinutes: number;
  /** Milliseconds left on the sleep timer, or null when none is running. */
  sleepRemaining: number | null;
  setSleepMinutes: (minutes: number) => void;
  /** Starts at this ayah, or pauses it if it is the one already playing. */
  toggleAyah: (globalAyahNumber: number) => void;
  /** Play/pause without changing position; starts at the top when stopped. */
  togglePlayback: () => void;
  stop: () => void;
};

function isRepeatMode(v: unknown): v is RepeatMode {
  return v === "off" || v === "ayah" || v === "surah";
}

function isPlaybackRate(v: unknown): v is number {
  return (
    typeof v === "number" &&
    (PLAYBACK_RATES as readonly number[]).includes(v)
  );
}

export function useRecitation(globalAyahNumbers: number[]): Recitation {
  const player = useAudioPlayer(undefined, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);

  const [currentAyah, setCurrentAyah] = useState<number | null>(null);
  const [reciterId, setReciterId] = useState(DEFAULT_RECITER);
  const [repeatMode, setRepeatModeState] = useState<RepeatMode>("off");
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [sleepMinutes, setSleepMinutesState] = useState(0);
  const [sleepRemaining, setSleepRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Loading is derived, not stored: the player reports `isLoaded` itself, and
   * a second copy in state would need an effect to keep the two in step —
   * which is exactly the cascading-render pattern to avoid. A paused-but-
   * loaded ayah is not loading, so the spinner never sticks after a pause.
   */
  const loading = currentAyah !== null && !status.isLoaded;

  /**
   * A reciter is a taste, not a session setting: someone who prefers Husary
   * prefers him tomorrow too. Loaded after mount rather than blocking the
   * screen — the default plays until the stored choice arrives, and an
   * unknown id (a reciter dropped from the table) falls back rather than
   * requesting a URL that does not exist.
   *
   * Repeat mode and speed are the same kind of preference (open.md §3.1 —
   * web parity), so they load alongside it in the same pass.
   */
  useEffect(() => {
    void (async () => {
      const [storedReciter, storedRepeat, storedRate] = await Promise.all([
        getPref(PREF_RECITER),
        getPref(PREF_REPEAT),
        getPref(PREF_RATE),
      ]);
      if (storedReciter && RECITERS.some((r) => r.id === storedReciter)) {
        setReciterId(storedReciter);
      }
      if (storedRepeat && isRepeatMode(storedRepeat)) {
        setRepeatModeState(storedRepeat);
      }
      if (storedRate !== null && isPlaybackRate(Number(storedRate))) {
        setPlaybackRateState(Number(storedRate));
      }
    })();
  }, []);

  /**
   * The ringer switch must not silence the Quran. A family listening to a
   * recitation with the phone on silent is the normal case, not the edge one,
   * and iOS defaults the other way.
   */
  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      // Recitation should not stop when the screen locks — that is how people
      // actually listen. The iOS background-audio mode is declared for this;
      // leaving the surah still stops playback, because the player is released
      // with the screen.
      shouldPlayInBackground: true,
    }).catch(() => {
      // A device that refuses the audio session still plays through the
      // speaker when the ringer is on — not worth an error banner.
    });
  }, []);

  /**
   * Read from callbacks that must not re-subscribe when the surah re-renders.
   * Assigned in an effect, never during render — refs must not be written
   * while rendering, and every read happens later, from a callback.
   */
  const ayahsRef = useRef(globalAyahNumbers);
  const reciterRef = useRef(reciterId);
  const rateRef = useRef(playbackRate);
  const repeatModeRef = useRef(repeatMode);
  useEffect(() => {
    ayahsRef.current = globalAyahNumbers;
    reciterRef.current = reciterId;
    rateRef.current = playbackRate;
    repeatModeRef.current = repeatMode;
  });

  const load = useCallback(
    (globalAyahNumber: number) => {
      setError(null);
      setCurrentAyah(globalAyahNumber);
      // The preferred bitrate for the reciter — `RECITERS` lists only folders
      // that exist on the CDN, so this is not a guess.
      player.replace(audioUrlsForAyah(globalAyahNumber, reciterRef.current)[0]);
      // A new track starts at the player's previous rate; the native player
      // keeps the last set value across `replace`, but applying it here makes
      // the very first load (before any change) correct too.
      player.setPlaybackRate(rateRef.current);
      player.play();
    },
    [player],
  );

  const stop = useCallback(() => {
    player.pause();
    setCurrentAyah(null);
    setError(null);
  }, [player]);

  // `stop` from the sleep timer interval, where the callback must be stable.
  const stopRef = useRef(stop);
  useEffect(() => {
    stopRef.current = stop;
  }, [stop]);

  /**
   * Auto-advance. Reciters record ayah by ayah, so a surah is a playlist of
   * separate files — without this, listening to al-Baqara means 286 taps.
   *
   * Repeat (open.md §3.1) folds into the same decision: `ayah` re-loads the
   * finished verse, `surah` wraps from the last verse back to the first.
   */
  useEffect(() => {
    if (!status.didJustFinish) return;
    const mode = repeatModeRef.current;
    const list = ayahsRef.current;
    const index = currentAyah === null ? -1 : list.indexOf(currentAyah);
    if (mode === "ayah" && index >= 0) {
      load(currentAyah!);
      return;
    }
    const next = index >= 0 ? list[index + 1] : undefined;
    if (next === undefined) {
      if (mode === "surah") {
        const first = list[0];
        if (first !== undefined) load(first);
        return;
      }
      // End of the surah: stop rather than loop, so a phone left on a table
      // does not restart Ya-Sin at 3am.
      stop();
      return;
    }
    load(next);
    // `currentAyah` is deliberately not a dependency: it changes on every
    // advance, and re-running this effect then would advance twice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.didJustFinish, load, stop]);

  /**
   * A track that never loads is the failure this app will actually hit — a
   * mosque hall's Wi-Fi, or a reciter file missing from the CDN. Without a
   * timeout the button just spins forever with nothing to tap.
   */
  const loadedRef = useRef(false);
  useEffect(() => {
    loadedRef.current = status.isLoaded;
  });

  useEffect(() => {
    if (currentAyah === null) return;
    const timer = setTimeout(() => {
      if (loadedRef.current) return;
      setCurrentAyah(null);
      player.pause();
      setError(tm("audioFailed"));
    }, LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [currentAyah, player]);

  const toggleAyah = useCallback(
    (globalAyahNumber: number) => {
      if (currentAyah === globalAyahNumber) {
        if (status.playing) player.pause();
        else player.play();
        return;
      }
      load(globalAyahNumber);
    },
    [currentAyah, load, player, status.playing],
  );

  const togglePlayback = useCallback(() => {
    if (currentAyah === null) {
      const first = ayahsRef.current[0];
      if (first !== undefined) load(first);
      return;
    }
    if (status.playing) player.pause();
    else player.play();
  }, [currentAyah, load, player, status.playing]);

  const setReciter = useCallback(
    (id: string) => {
      setReciterId(id);
      reciterRef.current = id;
      void setPref(PREF_RECITER, id);
      // Switching mid-ayah restarts the same ayah in the new voice, which is
      // what someone comparing reciters is asking for.
      if (currentAyah !== null) load(currentAyah);
    },
    [currentAyah, load],
  );

  /**
   * Speed and repeat are tastes, like the reciter — persisted, and applied to
   * the native player immediately so the change is audible on the next load.
   */
  const setRepeatMode = useCallback((mode: RepeatMode) => {
    setRepeatModeState(mode);
    repeatModeRef.current = mode;
    void setPref(PREF_REPEAT, mode);
  }, []);

  const setPlaybackRate = useCallback(
    (rate: number) => {
      setPlaybackRateState(rate);
      rateRef.current = rate;
      player.setPlaybackRate(rate);
      void setPref(PREF_RATE, String(rate));
    },
    [player],
  );

  /**
   * Sleep timer. The deadline lives in a ref so the countdown interval can
   * read it without re-subscribing every render; when it fires, playback
   * stops through the same `stop` the player bar uses.
   */
  const sleepDeadlineRef = useRef<number | null>(null);

  const setSleepMinutes = useCallback((minutes: number) => {
    setSleepMinutesState(minutes);
    if (minutes <= 0) {
      sleepDeadlineRef.current = null;
      setSleepRemaining(null);
      return;
    }
    sleepDeadlineRef.current = Date.now() + minutes * 60_000;
    setSleepRemaining(minutes * 60_000);
  }, []);

  useEffect(() => {
    if (sleepMinutes <= 0 || sleepDeadlineRef.current === null) return;
    const id = setInterval(() => {
      const deadline = sleepDeadlineRef.current;
      if (deadline === null) return;
      const left = deadline - Date.now();
      if (left <= 0) {
        sleepDeadlineRef.current = null;
        setSleepRemaining(null);
        setSleepMinutesState(0);
        stopRef.current();
        clearInterval(id);
      } else {
        setSleepRemaining(left);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [sleepMinutes]);

  return {
    currentAyah,
    playing: status.playing,
    loading,
    error,
    reciterId,
    setReciter,
    repeatMode,
    setRepeatMode,
    playbackRate,
    setPlaybackRate,
    sleepMinutes,
    sleepRemaining,
    setSleepMinutes,
    toggleAyah,
    togglePlayback,
    stop,
  };
}
