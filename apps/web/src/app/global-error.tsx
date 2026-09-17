"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect, useSyncExternalStore } from "react";

/**
 * The last-resort boundary: the root layout itself failed, so there is no
 * `NextIntlClientProvider` above this and `useTranslations` would throw.
 *
 * Hence the inline catalogue. Four strings are not worth a second message
 * pipeline, and printing German *and* English at once — which is what this did
 * — still left Bosnian and Turkish readers with neither.
 */
const MESSAGES = {
  de: {
    title: "Ein Fehler ist aufgetreten",
    body: "Bitte laden Sie die Seite neu. Das Problem wurde gemeldet.",
    retry: "Erneut versuchen",
  },
  en: {
    title: "An error occurred",
    body: "Please reload the page. The issue has been reported.",
    retry: "Try again",
  },
  bs: {
    title: "Došlo je do greške",
    body: "Molimo osvježite stranicu. Problem je prijavljen.",
    retry: "Pokušaj ponovo",
  },
  tr: {
    title: "Bir hata oluştu",
    body: "Lütfen sayfayı yeniden yükleyin. Sorun bildirildi.",
    retry: "Tekrar dene",
  },
} as const;

type Locale = keyof typeof MESSAGES;

const DEFAULT_LOCALE: Locale = "de";

function isLocale(value: string): value is Locale {
  return value in MESSAGES;
}

/** The path never changes under this component — it is a dead-end screen. */
const subscribeNever = () => () => {};

function localeFromPath(): Locale {
  const segment = window.location.pathname.split("/")[1] ?? "";
  return isLocale(segment) ? segment : DEFAULT_LOCALE;
}

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  /**
   * Read from the URL rather than a cookie: every app route is `/{locale}/…`,
   * so the path is the one signal still trustworthy when the layout is gone.
   *
   * `useSyncExternalStore` rather than state-plus-effect: it returns the
   * default during server render and the real locale on the client in the same
   * commit, so there is no flash of German and no setState in an effect.
   */
  const locale = useSyncExternalStore(subscribeNever, localeFromPath, () => DEFAULT_LOCALE);

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  const t = MESSAGES[locale];

  return (
    <html lang={locale}>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#0f172a",
          color: "#f1f5f9",
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <svg
            viewBox="0 0 24 24"
            fill="#16a34a"
            style={{ width: 48, height: 48, margin: "0 auto 1.5rem" }}
          >
            <path fillRule="evenodd" d="M5 21.5V13.8A11 11 0 0 1 12 3.55A11 11 0 0 1 19 13.8V21.5Z M7.6 21.5V13.8A8.4 8.4 0 0 1 12 6.41A8.4 8.4 0 0 1 16.4 13.8V21.5Z" />
            <circle cx="12" cy="1.55" r="1.15" />
          </svg>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              marginBottom: "0.5rem",
            }}
          >
            {t.title}
          </h1>
          <p style={{ color: "#94a3b8", marginBottom: "1.5rem" }}>{t.body}</p>
          {error.digest && (
            <p
              style={{
                fontFamily: "monospace",
                fontSize: "0.75rem",
                color: "#64748b",
                marginBottom: "1.5rem",
              }}
            >
              ID: {error.digest}
            </p>
          )}
          <button
            onClick={unstable_retry}
            style={{
              background: "#16a34a",
              color: "#fff",
              border: "none",
              borderRadius: "0.5rem",
              padding: "0.625rem 1.25rem",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            {t.retry}
          </button>
        </div>
      </body>
    </html>
  );
}
