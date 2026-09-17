"use client";

import { useTheme } from "./ThemeProvider";
import { useIsHydrated } from "@/hooks/use-is-hydrated";

export default function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();
    const hydrated = useIsHydrated();

    // The server cannot know the user's preferred theme (it's read from
    // localStorage on the client). Render a neutral, suppressed-hydration
    // shell until hydrated, then swap to the real icons.
    const resolvedTheme = hydrated ? theme : "light";

    return (
        <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            suppressHydrationWarning
            className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-card-border bg-card text-muted-foreground transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-foreground cursor-pointer"
        >
            {/* Sun icon */}
            <svg
                suppressHydrationWarning
                className={`h-4 w-4 transition-all ${resolvedTheme === "dark" ? "scale-0 rotate-90" : "scale-100 rotate-0"
                    }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
            </svg>
            {/* Moon icon */}
            <svg
                suppressHydrationWarning
                className={`absolute h-4 w-4 transition-all ${resolvedTheme === "light" ? "scale-0 -rotate-90" : "scale-100 rotate-0"
                    }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
            </svg>
        </button>
    );
}
