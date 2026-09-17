import { attendanceColors, dark, light, radius, space, type, type Palette } from "./tokens";
import { useThemeScheme } from "./provider";

/**
 * Dark mode is not optional — the web app has it and users expect parity.
 *
 * Which palette applies is the *resolved* scheme: the user's choice in
 * Settings, or the device's when they have not made one.
 */
export function usePalette(): Palette {
  return useThemeScheme().isDark ? dark : light;
}

export function useIsDark(): boolean {
  return useThemeScheme().isDark;
}

export { attendanceColors, radius, space, type };
export { ARABIC_FONT, useArabicFont } from "./fonts";
export type { Palette };
export {
  ThemeProvider,
  useThemePreference,
  THEME_PREFERENCES,
  type ThemePreference,
} from "./provider";
