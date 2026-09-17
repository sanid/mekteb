import { getTranslations } from "next-intl/server";
import { fetchSurahList } from "@/lib/quran-api";
import { SurahList } from "@/components/quran/SurahList";
import { requireStudent } from "@/lib/auth";

export default async function StudentQuranPage() {
  await requireStudent();
  const t = await getTranslations("Student");
  const surahs = await fetchSurahList();

  return (
    <SurahList
      surahs={surahs}
      labels={{
        title: t("quranTitle"),
        meccan: t("quranMeccan"),
        median: t("quranMedinan"),
        verses: t("quranVerses"),
      }}
    />
  );
}
