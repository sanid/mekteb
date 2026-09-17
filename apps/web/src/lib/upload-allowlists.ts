/**
 * Server-side MIME allowlists for uploads.
 *
 * Every upload path checks these *before* touching Storage, and the storage
 * buckets carry the same lists as `allowed_mime_types` (see the migration
 * `20260809000100_diploma_bucket_no_svg.sql` and
 * `20260809000200_lesson_resources_bucket_allowlist.sql`). Two layers on
 * purpose: a misconfigured bucket is still gated at the app boundary, and a
 * buggy app path is still gated by the storage backend.
 *
 * The shared rule: raster images only, never SVG. SVG is XML and can embed a
 * `<script>`; when the object sits in a *public* bucket it executes in any
 * browser that renders it (stored XSS).
 */

/** Raster image formats only — SVG is excluded (stored-XSS vector). */
export const IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export const EXT_FOR_IMAGE_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/**
 * Lesson resources are downloaded by students, parents and teachers (signed
 * URLs — always a download, never an inline render). Allowed are the document
 * formats a mosque school actually uses plus raster images, plain text and
 * audio/video. Active content (HTML, SVG, XML, scripts, executables) is
 * rejected even though it would only download: a stored `text/html` object
 * can still be opened in a browser by anyone with the link.
 *
 * Deliberately no `application/octet-stream`: browsers report unknown formats
 * as `text/plain` or `application/octet-stream`, and allowing the catch-all
 * would defeat the list. Unknown formats should be re-saved as PDF.
 */
export const LESSON_RESOURCE_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.apple.pages",
  "application/vnd.apple.keynote",
  "application/vnd.apple.numbers",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "text/plain",
  "text/markdown",
  "text/csv",
  "audio/mpeg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/wav",
  "audio/ogg",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "application/zip",
]);

/**
 * Lesson audio: plain audio formats only, matching the `lesson-audio` bucket.
 * No `application/octet-stream` — browsers report unknown formats as that, and
 * the catch-all would defeat the list.
 */
export const LESSON_AUDIO_MIME_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/wav",
  "audio/ogg",
]);
