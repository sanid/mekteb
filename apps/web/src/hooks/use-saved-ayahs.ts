"use client";

import { useCallback, useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export type SavedAyah = {
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  arabicText: string;
  translationText: string;
  translationEdition: string;
  note: string | null;
  savedAt: string;
};

export type SavedAyahInput = Omit<SavedAyah, "savedAt" | "note">;

type Row = {
  surah_number: number;
  surah_name: string;
  ayah_number: number;
  arabic_text: string;
  translation_text: string | null;
  translation_edition: string | null;
  note: string | null;
  created_at: string;
};

function fromRow(r: Row): SavedAyah {
  return {
    surahNumber: r.surah_number,
    surahName: r.surah_name,
    ayahNumber: r.ayah_number,
    arabicText: r.arabic_text,
    translationText: r.translation_text ?? "",
    translationEdition: r.translation_edition ?? "",
    note: r.note,
    savedAt: r.created_at,
  };
}

/**
 * Per-user saved ayahs with notes, persisted in `quran_saved_ayahs`
 * (RLS-scoped to the owner). Reads/writes go directly through the browser
 * Supabase client; the session cookie identifies the user.
 */
export function useSavedAyahs() {
  const [supabase] = useState(() => createClient());
  const [saved, setSaved] = useState<SavedAyah[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;
      setUserId(user?.id ?? null);
      if (user) {
        const { data } = await supabase
          .from("quran_saved_ayahs")
          .select("surah_number, surah_name, ayah_number, arabic_text, translation_text, translation_edition, note, created_at")
          .order("created_at", { ascending: false });
        if (active && data) setSaved((data as Row[]).map(fromRow));
      }
      if (active) setHydrated(true);
    })();
    return () => {
      active = false;
    };
  }, [supabase]);

  const isSaved = useCallback(
    (surahNumber: number, ayahNumber: number) =>
      saved.some((s) => s.surahNumber === surahNumber && s.ayahNumber === ayahNumber),
    [saved],
  );

  const getNote = useCallback(
    (surahNumber: number, ayahNumber: number) =>
      saved.find((s) => s.surahNumber === surahNumber && s.ayahNumber === ayahNumber)?.note ?? null,
    [saved],
  );

  const toggleAyah = useCallback(
    async (ayah: SavedAyahInput) => {
      if (!userId) return;
      const exists = saved.some(
        (s) => s.surahNumber === ayah.surahNumber && s.ayahNumber === ayah.ayahNumber,
      );
      if (exists) {
        setSaved((prev) =>
          prev.filter((s) => !(s.surahNumber === ayah.surahNumber && s.ayahNumber === ayah.ayahNumber)),
        );
        await supabase
          .from("quran_saved_ayahs")
          .delete()
          .eq("user_id", userId)
          .eq("surah_number", ayah.surahNumber)
          .eq("ayah_number", ayah.ayahNumber);
      } else {
        const optimistic: SavedAyah = { ...ayah, note: null, savedAt: new Date().toISOString() };
        setSaved((prev) => [optimistic, ...prev]);
        await supabase.from("quran_saved_ayahs").insert({
          user_id: userId,
          surah_number: ayah.surahNumber,
          surah_name: ayah.surahName,
          ayah_number: ayah.ayahNumber,
          arabic_text: ayah.arabicText,
          translation_text: ayah.translationText,
          translation_edition: ayah.translationEdition,
        });
      }
    },
    [supabase, userId, saved],
  );

  const removeAyah = useCallback(
    async (surahNumber: number, ayahNumber: number) => {
      if (!userId) return;
      setSaved((prev) =>
        prev.filter((s) => !(s.surahNumber === surahNumber && s.ayahNumber === ayahNumber)),
      );
      await supabase
        .from("quran_saved_ayahs")
        .delete()
        .eq("user_id", userId)
        .eq("surah_number", surahNumber)
        .eq("ayah_number", ayahNumber);
    },
    [supabase, userId],
  );

  const updateNote = useCallback(
    async (surahNumber: number, ayahNumber: number, note: string) => {
      if (!userId) return;
      const trimmed = note.trim() || null;
      setSaved((prev) =>
        prev.map((s) =>
          s.surahNumber === surahNumber && s.ayahNumber === ayahNumber ? { ...s, note: trimmed } : s,
        ),
      );
      await supabase
        .from("quran_saved_ayahs")
        .update({ note: trimmed, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("surah_number", surahNumber)
        .eq("ayah_number", ayahNumber);
    },
    [supabase, userId],
  );

  return { saved, hydrated, signedIn: Boolean(userId), isSaved, getNote, toggleAyah, removeAyah, updateNote };
}
