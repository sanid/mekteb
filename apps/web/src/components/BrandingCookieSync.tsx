"use client";

import { useEffect } from "react";

/**
 * Keeps the server-side brand-colour cache cookie in sync.
 *
 * The layout applies the mosque's primary/secondary colours as CSS custom
 * properties via a `<style>` tag (pre-paint, no flash — and no inline
 * `<script>`, which React refuses to run on the client). Those same colours
 * are cached in a cookie so the server can skip the auth + branding database
 * round-trip on every request. That cookie is set here, in an effect, rather
 * than in an inline script: a `<script>` rendered from a component would
 * trigger React's "scripts inside React components are never executed" warning.
 *
 * This component renders nothing; it only refreshes the cache cookie.
 */
export function BrandingCookieSync({
  primary,
  secondary,
}: {
  primary: string | null;
  secondary: string | null;
}) {
  useEffect(() => {
    if (primary) {
      document.cookie = `mosque_primary_color=${encodeURIComponent(primary)}; path=/; max-age=604800; SameSite=Lax`;
    }
    if (secondary) {
      document.cookie = `mosque_secondary_color=${encodeURIComponent(secondary)}; path=/; max-age=604800; SameSite=Lax`;
    }
  }, [primary, secondary]);

  return null;
}
