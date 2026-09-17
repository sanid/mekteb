import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";

import { getPref, PREF_THEME, setPref } from "@/lib/prefs";

/**
 * Light / dark / follow-the-device, chosen in Settings.
 *
 * The palettes already existed and already followed the phone; what was
 * missing is the choice. Following the device is not always what people want:
 * a mosque hall is dark while the phone is still on its daytime schedule, and
 * a parent reading the Quran at night has the opposite problem.
 *
 * `system` stays the default, so an app nobody has configured behaves exactly
 * as it did before.
 */
export type ThemePreference = "system" | "light" | "dark";

const PREFERENCES: ThemePreference[] = ["system", "light", "dark"];

function isPreference(value: string): value is ThemePreference {
  return (PREFERENCES as string[]).includes(value);
}

type ThemeValue = {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  /** What to actually paint — the preference resolved against the device. */
  isDark: boolean;
};

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const device = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  // Loaded after mount: the first frame or two use the device setting, which
  // is the same thing the app did before anyone could choose.
  useEffect(() => {
    void getPref(PREF_THEME).then((stored) => {
      if (stored && isPreference(stored)) setPreferenceState(stored);
    });
  }, []);

  const isDark = preference === "system" ? device === "dark" : preference === "dark";

  const value = useMemo<ThemeValue>(
    () => ({
      preference,
      isDark,
      setPreference: (next) => {
        setPreferenceState(next);
        void setPref(PREF_THEME, next);
      },
    }),
    [preference, isDark],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * The resolved scheme. Falls back to the device when no provider is above —
 * every screen renders inside one, but a palette hook that throws would take
 * the whole app down over a missing wrapper.
 *
 * Native alerts and the keyboard follow the *device* regardless: they are
 * drawn by iOS, not by us, so an in-app override cannot reach them.
 */
export function useThemeScheme(): { isDark: boolean } {
  const context = useContext(ThemeContext);
  const device = useColorScheme();
  return { isDark: context ? context.isDark : device === "dark" };
}

/** Read and change the preference — Settings only. */
export function useThemePreference(): ThemeValue {
  const context = useContext(ThemeContext);
  const device = useColorScheme();
  return (
    context ?? {
      preference: "system",
      isDark: device === "dark",
      setPreference: () => {},
    }
  );
}

export { PREFERENCES as THEME_PREFERENCES };
