import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireStudent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  fetchSurah,
  fetchSurahList,
  defaultTranslationForLocale,
} from "@/lib/quran-api";
import { QuranReaderClient } from "@/components/quran/QuranReaderClient";

type PageProps = {
  params: Promise<{ surahNumber: string }>;
};

export default async function StudentQuranReaderPage({ params }: PageProps) {
  const { surahNumber: raw } = await params;
  const surahNumber = parseInt(raw, 10);
  if (isNaN(surahNumber) || surahNumber < 1 || surahNumber > 114) notFound();

  const ctx = await requireStudent();
  const locale = await getLocale();
  const t = await getTranslations("Student");
  const supabase = await createClient();

  // Fetch surah data + student's hifz progress in parallel
  const [surahData, allSurahs, enrollmentData] = await Promise.all([
    fetchSurah(surahNumber, defaultTranslationForLocale(locale)),
    fetchSurahList(),
    supabase
      .from("group_enrollments")
      .select("group_id, groups(id, category_id, group_categories(is_hifz))")
      .eq("student_profile_id", ctx.studentProfileId)
      .eq("is_active", true),
  ]);

  // Determine hifz progress
  const hifzGroupIds = (enrollmentData.data ?? [])
    .map((e) => {
      const g = e.groups as { id: string; category_id: string | null; group_categories: { is_hifz: boolean } | null } | null;
      return g?.group_categories?.is_hifz ? g.id : null;
    })
    .filter((id): id is string => !!id);

  let hifzProgress = null;
  if (hifzGroupIds.length > 0) {
    const { data: hifzRows } = await supabase
      .from("hifz_progress")
      .select("pages_memorized")
      .eq("student_profile_id", ctx.studentProfileId)
      .in("group_id", hifzGroupIds)
      .order("pages_memorized", { ascending: false })
      .limit(1);
    if (hifzRows && hifzRows.length > 0) {
      hifzProgress = { pagesMemorized: hifzRows[0].pages_memorized };
    }
  }

  const surahMeta = allSurahs.find((s) => s.number === surahNumber);
  if (!surahMeta) notFound();

  return (
    <QuranReaderClient
      initialArabic={surahData.arabic}
      initialTranslation={surahData.translation}
      surahMeta={surahMeta}
      allSurahs={allSurahs}
      initialTranslationEdition={defaultTranslationForLocale(locale)}
      hifzProgress={hifzProgress}
      basePath="/student/quran"
      labels={{
        backToSurahs: t("quranBack"),
        translation: t("quranTranslation"),
        playAudio: t("quranPlayAudio"),
        pauseAudio: t("quranPauseAudio"),
        saveAyah: t("quranSaveAyah"),
        savedAyah: t("quranSavedAyah"),
        removeSaved: t("quranRemoveSaved"),
        ayah: t("quranAyah"),
        page: t("quranPage"),
        juz: t("quranJuz"),
        hifzTitle: t("hifzProgress"),
        hifzPages: t("hifzPages"),
        hifzJuz: t("hifzJuz"),
        hifzMemorized: t("hifzMemorized"),
        hifzComplete: t("hifzComplete"),
        savedAyahs: t("quranSavedAyahs"),
        noAudio: t("quranNoAudio"),
      }}
    />
  );
}
