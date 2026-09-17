"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  Loader2,
  BookmarkIcon,
  Settings2,
  StickyNote,
  Moon,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Link, useRouter } from "@/i18n/routing";
import type { SurahData, SurahMeta } from "@/lib/quran-api";
import { fetchSurah, audioUrlsForAyah, RECITERS } from "@/lib/quran-api";
import { useSavedAyahs } from "@/hooks/use-saved-ayahs";
import { useQuranSettings, type TextSize } from "@/hooks/use-quran-settings";
import { TranslationSelector } from "./TranslationSelector";
import { HifzProgressMini } from "./HifzProgressMini";
import { QuranSettingsPanel } from "./QuranSettingsPanel";

import { buttonVariants } from "@/components/ui/button";
export type HifzProgressData = { pagesMemorized: number } | null;

export type QuranReaderLabels = {
  backToSurahs: string;
  translation: string;
  playAudio: string;
  pauseAudio: string;
  saveAyah: string;
  savedAyah: string;
  removeSaved: string;
  ayah: string;
  page: string;
  juz: string;
  hifzTitle: string;
  hifzPages: string;
  hifzJuz: string;
  hifzMemorized: string;
  hifzComplete: string;
  noAudio: string;
  savedAyahs: string;
};

const SLEEP_OPTIONS = [0, 5, 10, 15, 30, 60];

const ARABIC_SIZE: Record<TextSize, string> = {
  sm: "text-lg",
  base: "text-xl",
  lg: "text-2xl",
  xl: "text-3xl",
  "2xl": "text-4xl",
};
const TRANS_SIZE: Record<TextSize, string> = {
  sm: "text-xs",
  base: "text-sm",
  lg: "text-base",
  xl: "text-lg",
  "2xl": "text-xl",
};

export function QuranReaderClient({
  initialArabic,
  initialTranslation,
  surahMeta,
  allSurahs,
  initialTranslationEdition,
  hifzProgress,
  labels,
  basePath,
}: {
  initialArabic: SurahData;
  initialTranslation: SurahData;
  surahMeta: SurahMeta;
  allSurahs: SurahMeta[];
  initialTranslationEdition: string;
  hifzProgress: HifzProgressData;
  labels: QuranReaderLabels;
  basePath: string;
}) {
  const tq = useTranslations("Quran");
  const router = useRouter();
  const searchParams = useSearchParams();

  const { settings, update, hydrated } = useQuranSettings();
  const { isSaved, toggleAyah, getNote, updateNote } = useSavedAyahs();

  const [translationEdition, setTranslationEdition] = useState(initialTranslationEdition);
  const [arabic] = useState(initialArabic);
  const [translation, setTranslation] = useState(initialTranslation);
  const [loading, setLoading] = useState(false);

  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [noteEditing, setNoteEditing] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  const [sleepMinutes, setSleepMinutes] = useState(0);
  const [sleepRemaining, setSleepRemaining] = useState<number | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const settingsRef = useRef(settings);
  const playingRef = useRef<number | null>(null);
  const endedRef = useRef<() => void>(() => {});
  const errorRef = useRef<() => void>(() => {});
  // Candidate URLs (one per bitrate) + which one we're currently trying.
  const urlsRef = useRef<string[]>([]);
  const urlIdxRef = useRef(0);
  const nextSurah = allSurahs.find((s) => s.number === surahMeta.number + 1);
  const prevSurah = allSurahs.find((s) => s.number === surahMeta.number - 1);

  // Keep refs current for the (stable) <audio> onended handler to read.
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);
  useEffect(() => {
    playingRef.current = playingIndex;
  }, [playingIndex]);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    setPlayingIndex(null);
    setIsPaused(false);
  }, []);

  const playIndex = useCallback(
    (i: number) => {
      const a = audioRef.current;
      const ayah = arabic.ayahs[i];
      if (!a || !ayah) return;
      a.playbackRate = settingsRef.current.playbackRate;
      urlsRef.current = audioUrlsForAyah(ayah.number, settingsRef.current.reciter);
      urlIdxRef.current = 0;
      a.src = urlsRef.current[0] ?? "";
      setPlayingIndex(i);
      setIsPaused(false);
      // A load failure (e.g. a missing bitrate) surfaces via the element's
      // "error" event, which drives the bitrate fallback; ignore the benign
      // AbortError that fires when a newer load replaces this one.
      a.play().catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
      });
      requestAnimationFrame(() => {
        document.getElementById(`ayah-${ayah.numberInSurah}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    },
    [arabic],
  );

  // Bitrate fallback: when a source fails to load, try the next candidate URL;
  // only surface the error once every bitrate has failed.
  useEffect(() => {
    errorRef.current = () => {
      const a = audioRef.current;
      if (!a) return;
      urlIdxRef.current += 1;
      const next = urlsRef.current[urlIdxRef.current];
      if (next) {
        a.src = next;
        a.play().catch(() => {});
      } else {
        toast.error(labels.noAudio);
        setPlayingIndex(null);
      }
    };
  }, [labels.noAudio]);

  // Advance logic, kept in a ref so the single <audio> onended handler always
  // sees the latest settings without re-binding.
  useEffect(() => {
    endedRef.current = () => {
      const s = settingsRef.current;
      const i = playingRef.current;
      if (i == null) return;
      if (s.repeat === "ayah") {
        playIndex(i);
        return;
      }
      const next = i + 1;
      if (next < arabic.ayahs.length) {
        if (s.continuous || s.repeat === "surah") playIndex(next);
        else stop();
      } else if (s.repeat === "surah") {
        playIndex(0);
      } else if (s.continuous && nextSurah) {
        router.push(`${basePath}/${nextSurah.number}?autoplay=1`);
      } else {
        stop();
      }
    };
  }, [playIndex, stop, arabic.ayahs.length, nextSurah, router, basePath]);

  // Create the single audio element once.
  useEffect(() => {
    const a = new Audio();
    a.preload = "auto";
    a.onended = () => endedRef.current();
    a.onerror = () => errorRef.current();
    audioRef.current = a;
    return () => {
      a.pause();
      a.onended = null;
      a.onerror = null;
      audioRef.current = null;
    };
  }, []);

  // Live-apply playback rate.
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = settings.playbackRate;
  }, [settings.playbackRate]);

  // Reciter change while playing → reload current ayah with the new voice.
  useEffect(() => {
    if (playingRef.current != null) playIndex(playingRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.reciter]);

  // Autoplay when arriving from a continuous surah transition.
  useEffect(() => {
    if (hydrated && searchParams.get("autoplay") === "1") {
      const id = setTimeout(() => playIndex(0), 150);
      return () => clearTimeout(id);
    }
  }, [hydrated, searchParams, playIndex]);

  // Sleep timer countdown.
  useEffect(() => {
    if (sleepMinutes <= 0) return;
    const deadline = Date.now() + sleepMinutes * 60_000;
    const id = setInterval(() => {
      const left = deadline - Date.now();
      if (left <= 0) {
        stop();
        setSleepMinutes(0);
        setSleepRemaining(null);
        clearInterval(id);
      } else {
        setSleepRemaining(left);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [sleepMinutes, stop]);

  const loadTranslation = useCallback(
    async (edition: string) => {
      if (edition === translationEdition) return;
      setLoading(true);
      try {
        const data = await fetchSurah(arabic.number, edition);
        setTranslation(data.translation);
        setTranslationEdition(edition);
      } catch {
        toast.error("Failed to load translation");
      } finally {
        setLoading(false);
      }
    },
    [arabic.number, translationEdition],
  );

  const handlePlayPause = useCallback(
    (i: number) => {
      const a = audioRef.current;
      if (!a) return;
      if (playingIndex === i) {
        if (isPaused) {
          a.play();
          setIsPaused(false);
        } else {
          a.pause();
          setIsPaused(true);
        }
      } else {
        playIndex(i);
      }
    },
    [playingIndex, isPaused, playIndex],
  );

  const openNote = useCallback(
    async (i: number) => {
      const ayah = arabic.ayahs[i];
      const transAyah = translation.ayahs[i];
      if (!isSaved(arabic.number, ayah.numberInSurah)) {
        await toggleAyah({
          surahNumber: arabic.number,
          surahName: arabic.englishName,
          ayahNumber: ayah.numberInSurah,
          arabicText: ayah.text,
          translationText: transAyah?.text ?? "",
          translationEdition,
        });
      }
      setNoteDraft(getNote(arabic.number, ayah.numberInSurah) ?? "");
      setNoteEditing(ayah.numberInSurah);
    },
    [arabic, translation, isSaved, toggleAyah, getNote, translationEdition],
  );

  const reciterName = RECITERS.find((r) => r.id === settings.reciter)?.name ?? "";
  const arabicCls = ARABIC_SIZE[settings.textSize];
  const transCls = TRANS_SIZE[settings.textSize];

  return (
    <div className="space-y-6 max-w-4xl pb-24">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href={basePath} className="flex items-center gap-1 text-sm text-muted hover:text-accent transition-colors">
            <ChevronLeft className="h-4 w-4" />
            {labels.backToSurahs}
          </Link>
          <Link href={`${basePath}/saved`} className="flex items-center gap-1 text-xs text-muted hover:text-accent transition-colors">
            <BookmarkIcon className="h-3 w-3" />
            {labels.savedAyahs}
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <TranslationSelector value={translationEdition} onChange={loadTranslation} label={labels.translation} />
          <button
            type="button"
            onClick={() => setSettingsOpen((v) => !v)}
            className={`rounded-lg p-2 transition-colors ${settingsOpen ? "bg-accent text-primary-foreground" : "text-muted hover:bg-accent-subtle hover:text-accent"}`}
            title={tq("settings")}
            aria-expanded={settingsOpen}
          >
            <Settings2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {settingsOpen && <QuranSettingsPanel settings={settings} update={update} />}

      {/* Surah title */}
      <div className="text-center space-y-1 py-4 border-b border-card-border">
        <h1 className="font-arabic text-3xl" lang="ar" dir="rtl">
          {surahMeta.name}
        </h1>
        <p className="text-sm text-muted">
          {surahMeta.englishName} · {surahMeta.englishNameTranslation} · {surahMeta.numberOfAyahs} {labels.ayah}
        </p>
      </div>

      {hifzProgress && (
        <HifzProgressMini
          pagesMemorized={hifzProgress.pagesMemorized}
          labels={{
            title: labels.hifzTitle,
            pages: labels.hifzPages,
            juz: labels.hifzJuz,
            memorized: labels.hifzMemorized,
            complete: labels.hifzComplete,
          }}
        />
      )}

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted" />
        </div>
      )}

      {/* ── Mushaf flow (continuous reading) ── */}
      {!loading && settings.mushafFlow && (
        <div className="space-y-6">
          {settings.showArabic && (
            <p className={`text-right leading-loose font-arabic ${arabicCls}`} dir="rtl" lang="ar">
              {arabic.ayahs.map((ayah, idx) => (
                <span key={ayah.numberInSurah}>
                  <span className={playingIndex === idx ? "bg-success-subtle rounded" : ""}>{ayah.text}</span>
                  <button
                    type="button"
                    onClick={() => handlePlayPause(idx)}
                    className="inline-flex items-center justify-center mx-1 text-success-fg align-middle hover:text-success-fg"
                    title={labels.playAudio}
                  >
                    ﴿{ayah.numberInSurah}﴾
                  </button>{" "}
                </span>
              ))}
            </p>
          )}
          {settings.showTranslation && (
            <p className={`leading-relaxed text-muted border-t border-card-border pt-4 ${transCls}`}>
              {translation.ayahs.map((t, idx) => (
                <span key={idx}>
                  <span className="text-success-fg font-semibold">{idx + 1}.</span> {t.text}{" "}
                </span>
              ))}
            </p>
          )}
        </div>
      )}

      {/* ── Per-ayah cards ── */}
      {!loading && !settings.mushafFlow && (
        <div className="space-y-4">
          {arabic.ayahs.map((ayah, idx) => {
            const transAyah = translation.ayahs[idx];
            const ayahSaved = isSaved(arabic.number, ayah.numberInSurah);
            const note = getNote(arabic.number, ayah.numberInSurah);
            const playing = playingIndex === idx && !isPaused;
            return (
              <div
                key={ayah.numberInSurah}
                id={`ayah-${ayah.numberInSurah}`}
                className={`rounded-xl border bg-card p-4 space-y-3 transition-colors ${playingIndex === idx ? "border-accent" : "border-card-border hover:border-accent/30"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-success-subtle text-success-fg text-xs font-semibold">
                      {ayah.numberInSurah}
                    </span>
                    <span className="text-xs text-muted">
                      {labels.page} {ayah.page} · {labels.juz} {ayah.juz}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handlePlayPause(idx)}
                      className="rounded-lg p-1.5 text-muted hover:bg-accent-subtle hover:text-accent transition-colors"
                      title={playing ? labels.pauseAudio : labels.playAudio}
                    >
                      {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => openNote(idx)}
                      className={`rounded-lg p-1.5 transition-colors ${note ? "text-accent" : "text-muted hover:bg-accent-subtle hover:text-accent"}`}
                      title={tq("addNote")}
                    >
                      <StickyNote className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        toggleAyah({
                          surahNumber: arabic.number,
                          surahName: arabic.englishName,
                          ayahNumber: ayah.numberInSurah,
                          arabicText: ayah.text,
                          translationText: transAyah?.text ?? "",
                          translationEdition,
                        })
                      }
                      className={`rounded-lg p-1.5 transition-colors ${ayahSaved ? "text-warning hover:bg-warning-subtle" : "text-muted hover:bg-accent-subtle hover:text-accent"}`}
                      title={ayahSaved ? labels.removeSaved : labels.saveAyah}
                    >
                      {ayahSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {settings.showArabic && (
                  <p className={`text-right leading-relaxed font-arabic ${arabicCls}`} dir="rtl" lang="ar">
                    {ayah.text}
                    <span className="inline-flex items-center justify-center mx-1 text-success-fg text-sm">
                      ﴿{ayah.numberInSurah}﴾
                    </span>
                  </p>
                )}

                {settings.showTranslation && transAyah && (
                  <p className={`text-muted leading-relaxed border-t border-card-border pt-2 ${transCls}`}>{transAyah.text}</p>
                )}

                {noteEditing === ayah.numberInSurah ? (
                  <div className="space-y-2 border-t border-card-border pt-2">
                    <textarea
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      rows={3}
                      placeholder={tq("notePlaceholder")}
                      className="w-full rounded-lg border border-card-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          await updateNote(arabic.number, ayah.numberInSurah, noteDraft);
                          setNoteEditing(null);
                          toast.success(tq("noteSaved"));
                        }}
                        className={buttonVariants({ size: "sm" })}
                      >
                        {tq("saveNote")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setNoteEditing(null)}
                        className="rounded-lg border border-card-border px-3 py-1.5 text-xs font-semibold hover:border-accent/40"
                      >
                        {tq("cancel")}
                      </button>
                    </div>
                  </div>
                ) : (
                  note && (
                    <button
                      type="button"
                      onClick={() => openNote(idx)}
                      className="flex w-full items-start gap-2 rounded-lg bg-accent-subtle/40 px-3 py-2 text-left text-xs text-foreground/80 border-t border-card-border"
                    >
                      <StickyNote className="h-3.5 w-3.5 shrink-0 mt-0.5 text-accent" />
                      <span className="whitespace-pre-wrap">{note}</span>
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Navigation footer */}
      <div className="flex items-center justify-between pt-4 border-t border-card-border">
        {prevSurah ? (
          <Link href={`${basePath}/${prevSurah.number}`} className="flex items-center gap-1 text-sm text-muted hover:text-accent transition-colors">
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{prevSurah.englishName}</span>
          </Link>
        ) : (
          <div />
        )}
        <Link href={basePath} className="text-sm text-muted hover:text-accent transition-colors">
          {labels.backToSurahs}
        </Link>
        {nextSurah ? (
          <Link href={`${basePath}/${nextSurah.number}`} className="flex items-center gap-1 text-sm text-muted hover:text-accent transition-colors">
            <span className="hidden sm:inline">{nextSurah.englishName}</span>
            <ChevronLeft className="h-4 w-4 rotate-180" />
          </Link>
        ) : (
          <div />
        )}
      </div>

      {/* ── Sticky player bar ── */}
      {playingIndex !== null && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-card-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {surahMeta.englishName} · {labels.ayah} {arabic.ayahs[playingIndex]?.numberInSurah}
              </p>
              <p className="truncate text-xs text-muted">{reciterName}</p>
            </div>

            {sleepRemaining != null && (
              <span className="flex items-center gap-1 text-xs text-muted tabular-nums">
                <Moon className="h-3.5 w-3.5" />
                {Math.floor(sleepRemaining / 60000)}:{String(Math.floor((sleepRemaining % 60000) / 1000)).padStart(2, "0")}
              </span>
            )}

            <select
              value={sleepMinutes}
              onChange={(e) => {
                const m = Number(e.target.value);
                setSleepMinutes(m);
                setSleepRemaining(m > 0 ? m * 60_000 : null);
              }}
              className="rounded-lg border border-card-border bg-background px-2 py-1 text-xs"
              title={tq("sleepTimer")}
            >
              {SLEEP_OPTIONS.map((m) => (
                <option key={m} value={m}>{m === 0 ? tq("sleepOff") : `${m}m`}</option>
              ))}
            </select>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => playingIndex > 0 && playIndex(playingIndex - 1)}
                disabled={playingIndex === 0}
                className="rounded-lg p-1.5 text-muted hover:text-accent disabled:opacity-40"
                title={tq("previous")}
              >
                <SkipBack className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handlePlayPause(playingIndex)}
                className="rounded-full bg-accent p-2 text-primary-foreground hover:bg-accent-hover"
                title={isPaused ? labels.playAudio : labels.pauseAudio}
              >
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => playingIndex < arabic.ayahs.length - 1 && playIndex(playingIndex + 1)}
                disabled={playingIndex >= arabic.ayahs.length - 1}
                className="rounded-lg p-1.5 text-muted hover:text-accent disabled:opacity-40"
                title={tq("next")}
              >
                <SkipForward className="h-4 w-4" />
              </button>
              <button type="button" onClick={stop} className="rounded-lg p-1.5 text-muted hover:text-danger-fg" title={tq("stop")}>
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
