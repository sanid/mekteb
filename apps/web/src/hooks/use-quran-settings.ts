"use client";

import { useCallback, useEffect, useState } from "react";

import { DEFAULT_RECITER } from "@/lib/quran-api";

export type RepeatMode = "off" | "ayah" | "surah";
export type TextSize = "sm" | "base" | "lg" | "xl" | "2xl";

export type QuranSettings = {
  reciter: string;
  playbackRate: number;
  repeat: RepeatMode;
  continuous: boolean; // auto-advance ayah → ayah (and surah → surah)
  showArabic: boolean;
  showTranslation: boolean;
  mushafFlow: boolean; // continuous flowing text instead of per-ayah cards
  textSize: TextSize;
};

const DEFAULTS: QuranSettings = {
  reciter: DEFAULT_RECITER,
  playbackRate: 1,
  repeat: "off",
  continuous: true,
  showArabic: true,
  showTranslation: true,
  mushafFlow: false,
  textSize: "xl",
};

const STORAGE_KEY = "mekteb-quran-settings";

function load(): QuranSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<QuranSettings>) };
  } catch {
    return DEFAULTS;
  }
}

/**
 * Per-device Quran reading + playback preferences, persisted to localStorage.
 * Starts from defaults on the server and during first paint, then hydrates
 * from storage — avoids SSR mismatch while keeping the prefs sticky.
 */
export function useQuranSettings() {
  const [settings, setSettings] = useState<QuranSettings>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Hydrate from localStorage after mount to avoid an SSR mismatch (server
    // and first client paint both render DEFAULTS).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettings(load());
    setHydrated(true);
  }, []);

  const update = useCallback((patch: Partial<QuranSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore quota / privacy-mode errors */
      }
      return next;
    });
  }, []);

  return { settings, update, hydrated };
}
