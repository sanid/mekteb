import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireTeacher } from "@/lib/auth";
import {
  fetchSurah,
  fetchSurahList,
  defaultTranslationForLocale,
} from "@/lib/quran-api";
import { QuranReaderClient } from "@/components/quran/QuranReaderClient";

type PageProps = {
  params: Promise<{ surahNumber: string }>;
};

export default async function TeacherQuranReaderPage({ params }: PageProps) {
  const { surahNumber: raw } = await params;
  const surahNumber = parseInt(raw, 10);
  if (isNaN(surahNumber) || surahNumber < 1 || surahNumber > 114) notFound();

  await requireTeacher();
  const locale = await getLocale();
  const t = await getTranslations("Teacher");

  const [surahData, allSurahs] = await Promise.all([
    fetchSurah(surahNumber, defaultTranslationForLocale(locale)),
    fetchSurahList(),
  ]);

  const surahMeta = allSurahs.find((s) => s.number === surahNumber);
  if (!surahMeta) notFound();

  return (
    <QuranReaderClient
      initialArabic={surahData.arabic}
      initialTranslation={surahData.translation}
      surahMeta={surahMeta}
      allSurahs={allSurahs}
      initialTranslationEdition={defaultTranslationForLocale(locale)}
      hifzProgress={null}
      basePath="/teacher/quran"
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
