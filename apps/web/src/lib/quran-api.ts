export type SurahMeta = {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
};

export type Ayah = {
  number: number;
  text: string;
  numberInSurah: number;
  juz: number;
  page: number;
  ruku: number;
  hizbQuarter: number;
  sajda: boolean;
  audio?: string;
};

export type SurahData = {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  revelationType: string;
  numberOfAyahs: number;
  ayahs: Ayah[];
};

export type TranslationOption = {
  identifier: string;
  language: string;
  name: string;
  englishName: string;
};

const BASE = "https://api.alquran.cloud/v1";
const AUDIO_CDN = "https://cdn.islamic.network/quran/audio";

export const ARABIC_EDITION = "quran-uthmani";
export const AUDIO_EDITION = "ar.alafasy";

export type Bitrate = 128 | 64;

export type Reciter = {
  /** alquran.cloud / islamic.network audio edition identifier */
  id: string;
  name: string;
  /** Bitrate folders this reciter actually has on the CDN, primary first. */
  bitrates: Bitrate[];
};

// Bitrate availability differs per reciter on cdn.islamic.network — some exist
// only at 64 kbps, some only at 128. The first entry is preferred; the rest are
// fallbacks tried on load error.
export const RECITERS: Reciter[] = [
  { id: "ar.alafasy", name: "Mishary Rashid Alafasy", bitrates: [128, 64] },
  { id: "ar.abdulbasitmurattal", name: "Abdul Basit (Murattal)", bitrates: [64] },
  { id: "ar.abdurrahmaansudais", name: "Abdurrahman As-Sudais", bitrates: [64] },
  { id: "ar.husary", name: "Mahmoud Khalil Al-Husary", bitrates: [128, 64] },
  { id: "ar.minshawi", name: "Mohamed Siddiq El-Minshawi", bitrates: [128] },
  { id: "ar.muhammadayyoub", name: "Muhammad Ayyoub", bitrates: [128] },
  { id: "ar.hudhaify", name: "Ali Al-Hudhaify", bitrates: [128, 64] },
  { id: "ar.shaatree", name: "Abu Bakr Ash-Shaatree", bitrates: [128, 64] },
  // Kept in step with the mobile list, which added these two with portraits.
  // Bitrates verified against the CDN: Shuraym has no 128 kbps folder.
  { id: "ar.mahermuaiqly", name: "Maher Al Muaiqly", bitrates: [128, 64] },
  { id: "ar.saoodshuraym", name: "Saood Ash-Shuraym", bitrates: [64] },
];

export const DEFAULT_RECITER = "ar.alafasy";

/**
 * Candidate audio URLs for an ayah, built directly from its global number
 * (1..6236) so switching reciter is instant. Returns one URL per available
 * bitrate (preferred first); the player falls back to the next on load error.
 */
export function audioUrlsForAyah(globalAyahNumber: number, reciterId: string): string[] {
  const reciter = RECITERS.find((r) => r.id === reciterId) ?? RECITERS[0];
  return reciter.bitrates.map((b) => `${AUDIO_CDN}/${b}/${reciter.id}/${globalAyahNumber}.mp3`);
}

/** Convenience: the preferred audio URL for an ayah. */
export function audioUrlForAyah(globalAyahNumber: number, reciterId: string): string {
  return audioUrlsForAyah(globalAyahNumber, reciterId)[0];
}

export const TRANSLATION_OPTIONS: TranslationOption[] = [
  { identifier: "en.sahih", language: "en", name: "Saheeh International", englishName: "Saheeh International" },
  { identifier: "en.pickthall", language: "en", name: "Pickthall", englishName: "Pickthall" },
  { identifier: "de.aburida", language: "de", name: "Abu Rida", englishName: "Abu Rida" },
  { identifier: "tr.diyanet", language: "tr", name: "Diyanet Isleri", englishName: "Diyanet Isleri" },
  { identifier: "bs.mlivo", language: "bs", name: "Muhamed Mehanovic", englishName: "Muhamed Mehanovic" },
];

export function defaultTranslationForLocale(locale: string): string {
  switch (locale) {
    case "de":
      return "de.aburida";
    case "tr":
      return "tr.diyanet";
    case "bs":
      return "bs.mlivo";
    case "en":
    default:
      return "en.sahih";
  }
}

export async function fetchSurahList(): Promise<SurahMeta[]> {
  const res = await fetch(`${BASE}/surah`, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error("Failed to fetch surah list");
  const json = (await res.json()) as { data: SurahMeta[] };
  return json.data;
}

export async function fetchSurah(
  number: number,
  translationEdition: string,
): Promise<{ arabic: SurahData; translation: SurahData }> {
  // Audio is built client-side from each ayah's global number (see
  // audioUrlForAyah), so we only fetch the Arabic + translation editions.
  const editions = [ARABIC_EDITION, translationEdition].join(",");
  const res = await fetch(`${BASE}/surah/${number}/editions/${editions}`, {
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error("Failed to fetch surah");
  const json = (await res.json()) as { data: SurahData[] };

  const [arabic, translation] = json.data;
  return { arabic, translation };
}

export async function fetchAyah(
  surahNumber: number,
  ayahNumber: number,
  translationEdition: string,
): Promise<{ arabic: Ayah; translation: Ayah; audio: string | undefined }> {
  const editions = [ARABIC_EDITION, translationEdition, AUDIO_EDITION].join(",");
  const res = await fetch(
    `${BASE}/ayah/${surahNumber}:${ayahNumber}/editions/${editions}`,
    { next: { revalidate: 86400 } },
  );
  if (!res.ok) throw new Error("Failed to fetch ayah");
  const json = (await res.json()) as {
    data: { number: number; text: string; audio?: string; numberInSurah: number }[];
  };
  const arabic = json.data[0];
  const translation = json.data[1];
  const audio = json.data[2];
  return {
    arabic: {
      number: arabic.number,
      text: arabic.text,
      numberInSurah: arabic.numberInSurah,
      juz: 0,
      page: 0,
      ruku: 0,
      hizbQuarter: 0,
      sajda: false,
    },
    translation: {
      number: translation.number,
      text: translation.text,
      numberInSurah: translation.numberInSurah,
      juz: 0,
      page: 0,
      ruku: 0,
      hizbQuarter: 0,
      sajda: false,
    },
    audio: audio?.audio,
  };
}
