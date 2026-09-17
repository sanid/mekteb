import { getTranslations } from "next-intl/server";
import { fetchSurahList } from "@/lib/quran-api";
import { SurahList } from "@/components/quran/SurahList";
import { requireAdmin } from "@/lib/auth";

export default async function AdminQuranPage() {
  await requireAdmin();
  const t = await getTranslations("Admin");
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
