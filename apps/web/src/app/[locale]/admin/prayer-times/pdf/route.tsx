import { getLocale, getTranslations } from "next-intl/server";
import { renderToBuffer } from "@react-pdf/renderer";

import { requireAdmin } from "@/lib/auth";
import { getActivePlugins } from "@/lib/plugins";
import { createClient } from "@/lib/supabase/server";
import { PRAYER_METHODS, type PrayerMethod } from "@/lib/prayer-times";
import { fetchPrayerCalendarByLocation } from "@/lib/aladhan";
import { buildPrayerCalendarDoc } from "@/lib/prayer-calendar-pdf";
import { dateFormatLocale, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const VALID_METHODS = new Set(PRAYER_METHODS.map((m) => m.id));

export async function GET(req: Request) {
  const ctx = await requireAdmin();

  const active = await getActivePlugins(ctx.mosqueId);
  if (!active.has("prayer_times")) {
    return new Response("Not found", { status: 404 });
  }

  const supabase = await createClient();
  const [{ data: mosque }, { data: branding }] = await Promise.all([
    supabase.from("mosques").select("name, prayer_location, prayer_method").eq("id", ctx.mosqueId).maybeSingle(),
    supabase
      .from("mosque_branding")
      .select(
        "primary_color, secondary_color, logo_url, app_name, welcome_message, contact_address, contact_phone, contact_email, contact_website",
      )
      .eq("mosque_id", ctx.mosqueId)
      .maybeSingle(),
  ]);

  if (!mosque?.prayer_location) {
    return new Response("Prayer location not configured", { status: 404 });
  }

  const method = (mosque.prayer_method && VALID_METHODS.has(mosque.prayer_method as PrayerMethod)
    ? mosque.prayer_method
    : "MWL") as PrayerMethod;

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const year = parseInt(searchParams.get("year") ?? "", 10) || now.getFullYear();
  const month = parseInt(searchParams.get("month") ?? "", 10) || now.getMonth() + 1;

  const calendar = await fetchPrayerCalendarByLocation(mosque.prayer_location, method, year, month);
  if (!calendar) {
    return new Response("Failed to fetch prayer times", { status: 502 });
  }

  const locale = await getLocale();
  const t = await getTranslations("Prayer");
  const tAdmin = await getTranslations("Admin");

  const dateLocale = dateFormatLocale(locale);
  const monthLabel = new Intl.DateTimeFormat(dateLocale, { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
  const printedOn = formatDate(now, locale);

  const doc = buildPrayerCalendarDoc({
    mosqueName: mosque.name ?? "Mosque",
    appName: branding?.app_name,
    logoUrl: branding?.logo_url,
    primaryColor: branding?.primary_color ?? "#16a34a",
    secondaryColor: branding?.secondary_color,
    location: mosque.prayer_location,
    timezone: calendar.timezone,
    // The human name of the method, not the enum the API takes.
    method: PRAYER_METHODS.find((m) => m.id === method)?.label ?? method,
    welcomeMessage: branding?.welcome_message,
    contact: {
      address: branding?.contact_address,
      phone: branding?.contact_phone,
      email: branding?.contact_email,
      website: branding?.contact_website,
    },
    monthLabel,
    printedOn,
    locale,
    days: calendar.days,
    i18n: {
      title: t("title"),
      location: tAdmin("prayerLocation"),
      timezone: tAdmin("timezone"),
      printedOn: tAdmin("printedOn"),
      day: tAdmin("prayerCalendarDay"),
      weekday: tAdmin("prayerCalendarWeekday"),
      hijri: tAdmin("prayerCalendarHijri"),
      contact: tAdmin("prayerCalendarContact"),
      method: tAdmin("prayerMethod"),
      fajr: t("fajr"),
      sunrise: t("sunrise"),
      dhuhr: t("dhuhr"),
      asr: t("asr"),
      maghrib: t("maghrib"),
      isha: t("isha"),
    },
  });

  const buffer = await renderToBuffer(doc);
  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="prayer-times-${year}-${String(month).padStart(2, "0")}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
