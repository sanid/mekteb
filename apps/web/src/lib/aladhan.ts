/**
 * Prayer times via the AlAdhan API (https://aladhan.com/prayer-times-api).
 * Given a free-text location, AlAdhan geocodes it and returns the day's
 * timings already converted to the location's local timezone.
 */

import { log } from "@/lib/logger";
import type { PrayerMethod, PrayerTimes } from "@/lib/prayer-times";

// AlAdhan's numeric calculation-method IDs for the methods we expose.
const ALADHAN_METHOD: Record<PrayerMethod, number> = {
  Jafari: 0,
  Karachi: 1,
  ISNA: 2,
  MWL: 3,
  Makkah: 4,
  Egypt: 5,
  Tehran: 7,
};

export type AlAdhanResult = {
  times: PrayerTimes;
  timezone: string;
};

type AlAdhanResponse = {
  code: number;
  data?: {
    timings: Record<string, string>;
    meta?: { timezone?: string };
  };
};

/** Strips trailing annotations like " (CET)" from AlAdhan time strings. */
function cleanTime(value: string | undefined): string {
  return (value ?? "").split(" ")[0];
}

export type AlAdhanCalendarDay = {
  /** Gregorian date for the day, used for weekday/Hijri formatting. */
  date: Date;
  times: PrayerTimes;
};

export type AlAdhanCalendarResult = {
  days: AlAdhanCalendarDay[];
  timezone: string;
};

export async function fetchPrayerCalendarByLocation(
  location: string,
  method: PrayerMethod,
  year: number,
  month: number,
): Promise<AlAdhanCalendarResult | null> {
  const methodId = ALADHAN_METHOD[method] ?? ALADHAN_METHOD.MWL;
  const url = `https://api.aladhan.com/v1/calendarByAddress/${year}/${month}?address=${encodeURIComponent(location)}&method=${methodId}`;

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) {
      log.warn("[aladhan] calendar request failed", { status: res.status, location, year, month });
      return null;
    }
    const json: {
      code: number;
      data?: {
        timings: Record<string, string>;
        date: { gregorian: { date: string } };
        meta?: { timezone?: string };
      }[];
    } = await res.json();
    if (json.code !== 200 || !json.data) {
      log.warn("[aladhan] unexpected calendar response", { code: json.code, location, year, month });
      return null;
    }

    const days: AlAdhanCalendarDay[] = json.data.map((entry) => {
      const [day, mon, yr] = entry.date.gregorian.date.split("-").map(Number);
      const t = entry.timings;
      return {
        date: new Date(yr, mon - 1, day),
        times: {
          fajr: cleanTime(t.Fajr),
          sunrise: cleanTime(t.Sunrise),
          dhuhr: cleanTime(t.Dhuhr),
          asr: cleanTime(t.Asr),
          maghrib: cleanTime(t.Maghrib),
          isha: cleanTime(t.Isha),
        },
      };
    });

    return { days, timezone: json.data[0]?.meta?.timezone ?? "UTC" };
  } catch (err) {
    log.warn("[aladhan] calendar fetch error", { error: err instanceof Error ? err.message : String(err), location, year, month });
    return null;
  }
}

export async function fetchPrayerTimesByLocation(
  location: string,
  method: PrayerMethod,
): Promise<AlAdhanResult | null> {
  const methodId = ALADHAN_METHOD[method] ?? ALADHAN_METHOD.MWL;
  const url = `https://api.aladhan.com/v1/timingsByAddress?address=${encodeURIComponent(location)}&method=${methodId}`;

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) {
      log.warn("[aladhan] request failed", { status: res.status, location });
      return null;
    }
    const json: AlAdhanResponse = await res.json();
    if (json.code !== 200 || !json.data?.timings) {
      log.warn("[aladhan] unexpected response", { code: json.code, location });
      return null;
    }

    const t = json.data.timings;
    return {
      times: {
        fajr: cleanTime(t.Fajr),
        sunrise: cleanTime(t.Sunrise),
        dhuhr: cleanTime(t.Dhuhr),
        asr: cleanTime(t.Asr),
        maghrib: cleanTime(t.Maghrib),
        isha: cleanTime(t.Isha),
      },
      timezone: json.data.meta?.timezone ?? "UTC",
    };
  } catch (err) {
    log.warn("[aladhan] fetch error", { error: err instanceof Error ? err.message : String(err), location });
    return null;
  }
}

/**
 * Same result as `fetchPrayerTimesByLocation` but from coordinates — the
 * mosques table stores latitude/longitude as well as a named location, and
 * the mobile prayer-times endpoint falls back to coordinates when the
 * location string is empty.
 */
export async function fetchPrayerTimesByCoordinates(
  latitude: number,
  longitude: number,
  method: PrayerMethod,
): Promise<AlAdhanResult | null> {
  const methodId = ALADHAN_METHOD[method] ?? ALADHAN_METHOD.MWL;
  const url = `https://api.aladhan.com/v1/timings?latitude=${latitude}&longitude=${longitude}&method=${methodId}`;

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) {
      log.warn("[aladhan] request failed", { status: res.status, latitude, longitude });
      return null;
    }
    const json: AlAdhanResponse = await res.json();
    if (json.code !== 200 || !json.data?.timings) {
      log.warn("[aladhan] unexpected response", { code: json.code, latitude, longitude });
      return null;
    }

    const t = json.data.timings;
    return {
      times: {
        fajr: cleanTime(t.Fajr),
        sunrise: cleanTime(t.Sunrise),
        dhuhr: cleanTime(t.Dhuhr),
        asr: cleanTime(t.Asr),
        maghrib: cleanTime(t.Maghrib),
        isha: cleanTime(t.Isha),
      },
      timezone: json.data.meta?.timezone ?? "UTC",
    };
  } catch (err) {
    log.warn("[aladhan] fetch error", {
      error: err instanceof Error ? err.message : String(err),
      latitude,
      longitude,
    });
    return null;
  }
}
