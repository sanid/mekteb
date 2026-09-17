import { api } from "./api";
import { peek, put } from "./resource";
import { getLocale } from "./i18n";
import type { LessonTextContent, LessonDetail } from "./types";

/**
 * Background fill of the per-lesson text cache.
 *
 * The lesson list deliberately carries titles only, and the detail endpoint is
 * fetched per lesson. So opening a lesson means a round trip and a spinner
 * unless the body was already cached. This runs silently after the list loads:
 * one request for every published lesson's text, stored under the exact cache
 * key the detail screen reads, so the body is there the moment the user taps.
 *
 * Text only — signed URLs are deliberately left out (`/student/lessons/content`
 * returns none). They expire, and the detail screen refetches them on every
 * visit anyway; the cache is a first paint, not a substitute for the network.
 * Audio is also fetched only when a lesson is actually opened.
 *
 * Best-effort by design: an offline device or a slow network fails this
 * quietly, and the lesson screen falls back to its normal loading state.
 */

/** How long a filled entry counts as fresh before the next list visit refills. */
const FILL_TTL_MS = 10 * 60 * 1000;

/** Per (lesson, locale) — survives navigation so a list visit does not refill. */
const lastFilledAt = new Map<string, number>();

export async function prefetchLessonText(): Promise<void> {
  try {
    const locale = getLocale();
    const contents = await api<LessonTextContent[]>("/student/lessons/content", {
      query: { locale },
    });
    const now = Date.now();

    for (const c of contents ?? []) {
      const key = `student/lessons/${c.id}?locale=${locale}`;

      // A lesson the user already opened keeps its full detail (with URLs);
      // the detail screen refetches on every visit, so there is nothing to
      // save by clobbering it with the text-only shape.
      const existing = peek<LessonDetail>(key);
      if (existing && (existing.resources.length > 0 || existing.audio.length > 0)) {
        continue;
      }

      const last = lastFilledAt.get(key);
      if (last && now - last < FILL_TTL_MS) continue;

      put<LessonDetail>(key, {
        id: c.id,
        title: c.title,
        body: c.body,
        updatedAt: c.updatedAt,
        topic: c.topic,
        resources: [],
        audio: [],
        signedUrlTtlSeconds: 3600,
      });
      lastFilledAt.set(key, now);
    }
  } catch {
    // Offline, rate limited, or a 5xx — the prefetch is best-effort.
  }
}
