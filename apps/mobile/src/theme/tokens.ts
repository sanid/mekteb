/**
 * Design tokens mirroring the web app's CSS variables so the two products read
 * as one, plus the mobile-only semantics the web doesn't need.
 *
 * When a second consumer appears this should move to `packages/tokens` and be
 * generated into both `globals.css` and this file from one source
 * (docs/mobile-app-plan.md §4.4).
 */

export const light = {
  background: "#fcfaf6",
  surface: "#f4ebd9",
  card: "#ffffff",
  cardBorder: "#e6dfd3",
  foreground: "#1c2420",
  muted: "#5c685f",
  faint: "#8a948c",
  accent: "#15803d",
  accentSubtle: "#edf5ef",
  onAccent: "#ffffff",
  danger: "#c2412d",
  dangerSubtle: "#fbe9e6",
  warning: "#8a5a12",
  warningSubtle: "#fbf1dc",
  info: "#2a6479",
  infoSubtle: "#e8f0f3",
};

export const dark = {
  background: "#090e0c",
  surface: "#0c120f",
  card: "#0f1613",
  cardBorder: "#1b2620",
  foreground: "#f2f7f4",
  muted: "#809085",
  faint: "#5f6d64",
  accent: "#10b981",
  accentSubtle: "#0b231a",
  onAccent: "#090e0c",
  danger: "#f2917f",
  dangerSubtle: "#2a1612",
  warning: "#f0bd5c",
  warningSubtle: "#281f0e",
  info: "#7cc2dc",
  infoSubtle: "#10212a",
};

export type Palette = typeof light;

/**
 * Attendance colour is semantic, not decorative — a teacher scanning a class
 * list should read status by colour before reading the label.
 */
export function attendanceColors(p: Palette) {
  return {
    present: { fg: p.accent, bg: p.accentSubtle },
    absent: { fg: p.danger, bg: p.dangerSubtle },
    late: { fg: p.warning, bg: p.warningSubtle },
    excused: { fg: p.info, bg: p.infoSubtle },
  } as const;
}

/** 4pt scale. Use these rather than sprinkling literals. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

/** Mirrors web: controls 10 · cards 14 · sheets 18. */
export const radius = {
  sm: 10,
  md: 14,
  lg: 14,
  sheet: 18,
  pill: 999,
} as const;

/**
 * Type scale — mirrors the web ramp. Inline `fontSize` literals should use one
 * of these values: label 12 · small 13 · body 15 · lead 16 · h2 18 · h1 24 ·
 * display 28/32.
 */
export const type = {
  label: 12,
  small: 13,
  meta: 14,
  body: 15,
  lead: 16,
  h2: 18,
  h1: 24,
  display: 28,
  hero: 32,
} as const;
