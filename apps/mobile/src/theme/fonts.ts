import { AmiriQuran_400Regular, useFonts } from "@expo-google-fonts/amiri-quran";

/**
 * Quranic text is set in Amiri Quran — the cut of Amiri drawn specifically for
 * Quranic typesetting, so vowel marks and pause signs sit clear of the
 * letterforms instead of colliding with them the way a UI font's Arabic
 * fallback does. One weight (400) exists by design; do not ask for bold.
 *
 * Use it for scripture only. Arabic *interface* text (a name, a label) stays
 * in the system font so it matches the rest of the UI.
 */
export const ARABIC_FONT = "AmiriQuran_400Regular";

/**
 * The family name once the font is on the device, `undefined` while it loads.
 *
 * Returning `undefined` rather than blocking is deliberate: the reader should
 * paint immediately in the system Arabic face and swap, not hold an empty
 * screen for a font. `useFonts` is idempotent, so screens may call this
 * independently of the preload in the root layout.
 */
export function useArabicFont(): string | undefined {
  const [loaded] = useFonts({ AmiriQuran_400Regular });
  return loaded ? ARABIC_FONT : undefined;
}
