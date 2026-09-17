/**
 * Shared types and constants for the prayer-times feature. Actual times are
 * fetched from the AlAdhan API (see `@/lib/aladhan`).
 */

export type PrayerMethod =
  | "MWL"
  | "ISNA"
  | "Egypt"
  | "Makkah"
  | "Karachi"
  | "Tehran"
  | "Jafari";

export const PRAYER_METHODS: { id: PrayerMethod; label: string }[] = [
  { id: "MWL", label: "Muslim World League" },
  { id: "ISNA", label: "Islamic Society of North America" },
  { id: "Egypt", label: "Egyptian General Authority" },
  { id: "Makkah", label: "Umm al-Qura, Makkah" },
  { id: "Karachi", label: "University of Islamic Sciences, Karachi" },
  { id: "Tehran", label: "Institute of Geophysics, Tehran" },
  { id: "Jafari", label: "Shia Ithna-Ashari (Jafari)" },
];

export type PrayerTimes = {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
};

export type PrayerKey = keyof PrayerTimes;

export const PRAYER_ORDER: PrayerKey[] = [
  "fajr",
  "sunrise",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
];
