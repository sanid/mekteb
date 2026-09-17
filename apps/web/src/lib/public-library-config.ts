// Shared by the admin form (client) and the public library loader (server).
export const LIBRARY_FONTS = ["sans", "serif", "rounded"] as const;
export const LIBRARY_THEMES = ["system", "light", "dark", "sepia"] as const;
export type LibraryFont = (typeof LIBRARY_FONTS)[number];
export type LibraryTheme = (typeof LIBRARY_THEMES)[number];
