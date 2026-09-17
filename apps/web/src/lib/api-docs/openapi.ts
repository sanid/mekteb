export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

import { authPaths } from "./paths/auth";
import { adminPaths } from "./paths/admin";
import { adminMorePaths } from "./paths/admin-more";
import { teacherParentPaths } from "./paths/teacher-parent";
import { studentPaths } from "./paths/student";
import { examPaths } from "./paths/exams";
import { messagingPaths } from "./paths/messaging";
import { miscPaths } from "./paths/misc";
import { internalPaths } from "./paths/internal";

export const openapiSpec: Json = {
  openapi: "3.1.0",
  info: {
    title: "Mekteb API",
    version: "1.0.0",
    description:
      "The Mekteb mosque education & community platform API. This is the contract served by the web app at `/api/v1/**` and consumed by the native mobile apps and home-screen widgets.\n\n" +
      "## Authentication\n" +
      "Almost every `/api/v1` endpoint requires `Authorization: Bearer <accessToken>`. Tokens are issued by `POST /api/v1/auth/sign-in` (and refreshed via `POST /api/v1/auth/refresh`). The token resolves the caller to a role — `mosque_admin`, `examiner`, `teacher`, `parent`, `student` — and every guard derives the tenant (`mosque_id`) from that role's active membership. Users flagged `must_rotate_password` are rejected by all strict guards (401) until they rotate via `POST /api/v1/auth/change-password`.\n\n" +
      "Cron endpoints (`/api/notifications/send-emails`, `/api/notifications/send-push`, `/api/reports/send-cards`) authenticate with `Authorization: Bearer <CRON_SECRET>`; `/api/notifications/send-push` additionally accepts `PUSH_WEBHOOK_SECRET` so the database trigger can call it. The Stripe webhook authenticates via the `stripe-signature` header.\n\n" +
      "## Response envelope\n" +
      "Success: `{ \"ok\": true, \"data\": ... }` · Failure: `{ \"ok\": false, \"error\": \"...\", \"code\": \"...\" }`. `code` is a stable machine-readable key; `error` is already sanitised and safe to display. Note: the internal endpoints under `/api/` (webhooks, cron, checkout, health, dev) deliberately use their own bare response shapes.\n\n" +
      "## Rate limiting\n" +
      "Only the auth and account endpoints are rate-limited (`429 rate_limited` with a `Retry-After` header): sign-in (10 / 15 min per account), refresh (60 / 60 s), change-password (5 / 15 min), forgot-password (5 / 60 min per address + 20 / IP), reset-password (10 / 60 min), account delete-request and export (3 / 24 h each).",
  },
  servers: [
    { url: "https://{slug}.mekteb.de", description: "Production (mosque subdomain)", variables: { slug: { default: "app", description: "Mosque slug (subdomain)" } } },
    { url: "https://mekteb.de", description: "Production (root domain)" },
    { url: "http://localhost:3000", description: "Local development" },
  ],
  security: [{ bearerAuth: [] }],
  tags: [
    { name: "Authentication", description: "Sign in, refresh, sign out, password rotation and recovery, TOTP MFA." },
    { name: "Account", description: "The caller's own profile and GDPR self-service (export, deletion request)." },
    { name: "Devices", description: "Push-notification device token registration for the native apps." },
    { name: "Admin · Groups", description: "Classes: creation, enrolment and teacher assignment." },
    { name: "Admin · Students", description: "Student records, logins, parent links and per-student lesson toggles." },
    { name: "Admin · Teachers", description: "Teacher records and their accounts." },
    { name: "Admin · Parents", description: "Parent records and their accounts." },
    { name: "Admin · People", description: "Cross-role people lookup and bulk account creation." },
    { name: "Admin · Lessons", description: "Lesson content and attached resources." },
    { name: "Admin · Topics", description: "Curriculum topics and their ordering." },
    { name: "Admin · Announcements", description: "Mosque-wide announcements: drafting and publishing." },
    { name: "Admin · Enrollment", description: "Public enrolment requests awaiting a decision." },
    { name: "Admin · Exams", description: "Mosque-wide view of scheduled and completed exams." },
    { name: "Admin · Settings", description: "Mosque profile, branding, logo, prayer times and plugin toggles." },
    { name: "Admin · Security", description: "The tenant audit log." },
    { name: "Admin · GDPR", description: "Handling data-subject requests, including executing deletions." },
    { name: "Teacher", description: "A teacher's own groups, students, notes and announcements." },
    { name: "Parent", description: "A parent's children and homework acknowledgements." },
    { name: "Student", description: "The signed-in student's own profile, groups, attendance, homework and exams." },
    { name: "Student · Lessons", description: "Lesson listings and content for the signed-in student." },
    { name: "Exams · Requests", description: "Students requesting an exam; staff triaging the queue." },
    { name: "Exams · Scheduling", description: "Confirming, scheduling and rescheduling exam sittings." },
    { name: "Exams · Sessions", description: "Running an exam sitting and recording lesson checks." },
    { name: "Exams · Written tests", description: "Token-addressed written tests and their submissions." },
    { name: "Exams · Question bank", description: "The examiner's pool of questions." },
    { name: "Messaging", description: "Threads between staff, parents and students." },
    { name: "Notifications", description: "The caller's notification feed and read state." },
    { name: "Calendar", description: "Lesson sessions and other dated events." },
    { name: "Attendance", description: "Per-group attendance registers." },
    { name: "Check-in", description: "Token-addressed self check-in, used by the kiosk flow." },
    { name: "Homework", description: "Assigning and editing homework for a group." },
    { name: "Announcements", description: "Announcements as read by members." },
    { name: "Prayer times", description: "The mosque's prayer schedule." },
    { name: "Quran", description: "Saved ayahs for the signed-in user." },
    { name: "Report", description: "Report-card generation." },
    { name: "Widget", description: "The compact payload behind the home-screen widgets." },
    { name: "Internal", description: "Not part of the public contract: health, billing, cron jobs, webhooks and this document. These use their own bare response shapes, not the `{ ok, data }` envelope." },
  ],
  paths: {
    ...authPaths,
    ...adminPaths,
    ...adminMorePaths,
    ...teacherParentPaths,
    ...studentPaths,
    ...examPaths,
    ...messagingPaths,
    ...miscPaths,
    ...internalPaths,
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      cronSecret: { type: "http", scheme: "bearer", description: "Bearer <CRON_SECRET> for cron-triggered jobs." },
      stripeSignature: { type: "apiKey", in: "header", name: "stripe-signature", description: "Stripe webhook signature." },
    },
    schemas: {
      Success: {
        type: "object",
        required: ["ok", "data"],
        properties: {
          ok: { type: "boolean", enum: [true] },
          data: { nullable: true, description: "Endpoint-specific payload." },
        },
      },
      Error: {
        type: "object",
        required: ["ok", "error"],
        properties: {
          ok: { type: "boolean", enum: [false] },
          error: { type: "string", description: "Human-readable, sanitised message." },
          code: { type: "string", nullable: true, description: "Stable machine-readable error code when available." },
        },
      },
      PaginationOffset: {
        type: "object",
        properties: {
          limit: { type: "integer" },
          offset: { type: "integer" },
          total: { type: "integer", nullable: true },
          nextOffset: { type: "integer", nullable: true },
        },
      },
      PaginationKeyset: {
        type: "object",
        properties: {
          nextCursor: { type: "string", nullable: true, description: "Pass back as `before` on the next page." },
        },
      },
      TempPassword: {
        type: "object",
        properties: {
          email: { type: "string" },
          full_name: { type: "string" },
          tempPassword: { type: "string", description: "One-time password in XXXX-XXXX-XXXX form. Returned exactly once." },
          expires_at: { type: "string", format: "date-time", description: "OTP expiry, 7 days from issue." },
        },
      },
      BlockNoteJson: {
        type: "array",
        description: "BlockNote editor JSON. Real lessons use only paragraph, heading (2-3), bulletListItem and numberedListItem blocks with plain-text content. Unknown block types must be ignored by clients.",
        items: { type: "object" },
      },
      UserRole: {
        type: "string",
        enum: ["mosque_admin", "examiner", "teacher", "parent", "student", "none"],
      },
      Locale: {
        type: "string",
        enum: ["de", "en", "bs", "tr"],
      },
    },
    responses: {
      Unauthorized: {
        description: "Missing/invalid bearer token, or the user must rotate their password.",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
      },
      Forbidden: {
        description: "Authenticated but not permitted for this resource.",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
      },
      NotFound: {
        description: "Resource not found, or (for plugin gates) the feature is not enabled for this mosque.",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
      },
      BadRequest: {
        description: "Malformed request or invalid input.",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
      },
      ValidationFailed: {
        description: "Zod validation failed. `error` reads `<path>: <message>`.",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
      },
      DbError: {
        description: "A database/Supabase failure, mapped to a safe message by the server.",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
      },
      RateLimited: {
        description: "Rate limit exceeded. Honor the `Retry-After` header (seconds).",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
      },
    },
  },
};
