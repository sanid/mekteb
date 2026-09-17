import { getLocale, getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { getActivePlugins } from "@/lib/plugins";
import { PRAYER_METHODS, type PrayerMethod } from "@/lib/prayer-times";
import { fetchPrayerTimesByLocation } from "@/lib/aladhan";
import { PrayerTimesCard } from "@/components/PrayerTimesCard";

const VALID_METHODS = new Set(PRAYER_METHODS.map((m) => m.id));

/**
 * Reads the mosque's prayer-time configuration and renders the card. Returns
 * null when the `prayer_times` plugin is off, the location isn't set yet, or
 * the AlAdhan API can't resolve it — so dashboards can drop it in
 * unconditionally.
 */
export async function PrayerTimesSection({ mosqueId }: { mosqueId: string }) {
  const active = await getActivePlugins(mosqueId);
  if (!active.has("prayer_times")) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("mosques")
    .select("prayer_location, prayer_method")
    .eq("id", mosqueId)
    .maybeSingle();

  if (!data?.prayer_location) return null;

  const method = (data.prayer_method && VALID_METHODS.has(data.prayer_method as PrayerMethod)
    ? data.prayer_method
    : "MWL") as PrayerMethod;

  const result = await fetchPrayerTimesByLocation(data.prayer_location, method);
  if (!result) return null;

  const locale = await getLocale();
  const t = await getTranslations("Prayer");

  return (
    <PrayerTimesCard
      times={result.times}
      timezone={result.timezone}
      locale={locale}
      labels={{
        title: t("title"),
        fajr: t("fajr"),
        sunrise: t("sunrise"),
        dhuhr: t("dhuhr"),
        asr: t("asr"),
        maghrib: t("maghrib"),
        isha: t("isha"),
        next: t("next"),
      }}
    />
  );
}
