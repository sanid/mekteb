import * as SecureStore from "expo-secure-store";

/**
 * Small, non-secret preferences that should survive a relaunch.
 *
 * Stored in `expo-secure-store` rather than AsyncStorage — not because a
 * reciter choice is a secret, but because AsyncStorage is another native
 * module, and adding one invalidates every existing dev build (AGENTS.md §10).
 * The keychain is happy to hold a short string, and the app already depends on
 * it for tokens.
 *
 * Everything here is best-effort: a preference that fails to load or save must
 * never surface an error or block a screen — the user simply gets the default.
 */
const PREFIX = "mekteb.pref.";

export async function getPref(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(PREFIX + key);
  } catch {
    return null;
  }
}

export async function setPref(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(PREFIX + key, value);
  } catch {
    // A device that refuses the write just forgets the choice next launch.
  }
}

/** Keys live here so two screens cannot disagree about spelling. */
export const PREF_RECITER = "quran.reciter";
export const PREF_REPEAT = "quran.repeat";
export const PREF_RATE = "quran.rate";
export const PREF_LOCALE = "locale";
export const PREF_THEME = "theme";
/** Calendar scope: "mine" (default) or "mosque". */
export const PREF_CALENDAR_SCOPE = "calendar.scope";
