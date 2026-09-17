"use client";

import { useEffect } from "react";
import type { CSSProperties } from "react";
import { ApiReferenceReact } from "@scalar/api-reference-react";
import { useTheme } from "@/components/ThemeProvider";
// Scalar ships its own stylesheet. Without this import the reference renders
// as unstyled body text: no sidebar, no search, no typography, and the
// download button's label doubles up.
import "@scalar/api-reference-react/style.css";

/**
 * Height of this page's own sticky header (`h-16`). Scalar derives
 * `--refs-header-height`, the sidebar's sticky `top`, its height, and every
 * scroll-anchor offset from this variable. Left unset it assumes it owns the
 * viewport, so the sidebar sticks to `top: 0` behind our header and runs a
 * header's worth of height off the bottom of the screen.
 */
const HEADER_HEIGHT = "4rem";

export default function ApiDocsClient({ locale }: { locale: string }) {
  // Scalar otherwise picks its own theme from the OS, which leaves a dark app
  // header sitting on top of a light reference. The app's own toggle in the
  // header drives both, so Scalar's duplicate toggle stays hidden.
  const { theme } = useTheme();

  // Scalar themes itself off a class on <body>, which it writes once on mount
  // (from `forceDarkModeState`) and then only rewrites when *its own* color
  // mode changes — so toggling the app theme would leave the reference stuck
  // on the mount-time palette. Drive the class directly instead, and drop it
  // on unmount: Scalar never cleans it up, which would otherwise leave the
  // rest of the app carrying its palette variables after a client-side
  // navigation away from the docs.
  useEffect(() => {
    const { classList } = document.body;
    classList.toggle("dark-mode", theme === "dark");
    classList.toggle("light-mode", theme !== "dark");
    return () => classList.remove("light-mode", "dark-mode");
  }, [theme]);

  return (
    <div style={{ "--scalar-custom-header-height": HEADER_HEIGHT } as CSSProperties}>
      <ApiReferenceReact
        configuration={{
          url: "/api/docs/openapi.json",
          localization: { locale },
          forceDarkModeState: theme,
          hideDarkModeToggle: true,
          documentDownloadType: "json",
        }}
      />
    </div>
  );
}
