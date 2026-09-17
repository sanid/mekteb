# Mekteb Mobile — working rules

Read this before writing code in `apps/mobile`. Every rule here comes from a
bug that actually happened in this repo, not from general best practice.

---

## 0. Check these four things before starting any screen

1. **Does the endpoint exist?** `apps/web/src/app/api/v1/**` is the contract.
   If a screen needs data no route returns, add the route in the web app
   first. Do not query Supabase directly to work around a missing endpoint.
2. **Is the feature plugin-gated?** Ten plugins can be off per mosque. If the
   web portal hides it behind `plugin: "..."`, the app must hide it too, using
   `plugins[]` from `/auth/me`.
3. **Which roles can see it?** Check the `requireApiX` guard on the route.
   Users hold *multiple* roles — read `roles[]`, never `role` alone.
4. **Are there strings?** They go in `messages/*.json` in **all four** locales
   (de, en, bs, tr) or `pnpm check:i18n` fails. There is no English-only path.

---

## 1. Never talk to Supabase directly

Exception, and only this: **auth token lifecycle and Realtime**.

Everything else goes through `/api/v1`. The business logic (onboarding,
password rotation, audit logging, exam scheduling) lives server-side, error
messages are **localised on the server**, and DB errors are sanitised there.
A direct query gets you raw Postgres text in English and skips the audit log.

## 2. One API client, one envelope

Every response is `{ ok: true, data }` or `{ ok: false, error, code }`.
Unwrap it in **one** place, along with:

- **401 → refresh once → retry once.** Never loop.
- **429 → honour `Retry-After`.** The header is in seconds.
- `error` is already localised and safe to show. `code` is for branching.

Do not `fetch` from a screen. Do not unwrap the envelope in a component.

## 3. Locale rules

### German is the default — the app is German-first

`de` is the default locale, matching the web app (`packages/i18n` →
`defaultLocale`). This is not a fallback of last resort; it is what most users
actually see. Concretely:

- **A screen is not finished until it reads correctly in German.** English is
  the *translation* here, not the source. If you only ever look at it in
  English you are testing the least-used path.
- **Never hardcode a user-visible string.** Every label, button, empty state
  and error goes through `t()` against the shared catalogue. A hardcoded
  English string is a permanent German bug that no test will catch — it will
  typecheck, bundle, and render wrong.
- **Design for German length.** German runs ~30% longer than English
  ("Anwesenheit speichern" vs "Save attendance"). Rows of side-by-side
  controls and fixed-width buttons are where this breaks. Check the four
  attendance status pills and any button with an icon beside text.
- The device may report a locale we do not support; fall back to `de`, not to
  the device language.
- Dates already follow the locale via `formatDate` — but a German date beside
  an English label is worse than either alone, so the two must move together.


- **Never** call `toLocaleDateString()`, `toLocaleString()` or
  `toLocaleTimeString()` — bare or with `undefined`. This shipped a bug where
  every locale saw German dates. Use the shared format helpers and pass the
  active locale explicitly.
- Send `?locale=` to endpoints that accept it (`/student/lessons` and its
  detail route return `lesson_translations` content).
- `bs` → `bs-BA`, `tr` → `tr-TR`, `de` → `de-DE`, `en` → `en-US`. Never pass a
  bare app code to `Intl`.
- Before adding a translation, check the word isn't already used for something
  else in that namespace. In Bosnian, "Announcements" and "Notifications" both
  rendered *Obavještenja* — two sidebar items you couldn't tell apart.
  `check:i18n` cannot catch this; only reading can.

## 4. Auth specifics

- **Students have no email.** They sign in with a mosque-qualified username,
  `al-nour.amina`. The sign-in field accepts an email *or* that. Never label it
  "Email".
- Handle `mustRotatePassword` — route to change-password before anything else.
- Handle `mfaRequired` — `/auth/mfa/challenge` then `/verify`.
- Store tokens in **`expo-secure-store`**, never `AsyncStorage`. These are
  children's accounts.

## 5. Data that expires or moves

- **Signed URLs for lesson resources expire (1 h).** Cache the resource list,
  never the URL. Refetch the detail route instead.
- **Push tokens rotate.** Re-register on every launch; `/api/v1/devices` is
  idempotent on `(user_id, token)`.

## 6. Lesson content

`body` is BlockNote JSON. Across all real lessons only four block types occur —
`paragraph`, `heading` (levels 2–3), `bulletListItem`, `numberedListItem` —
with plain-text content and no inline styles. Render natively.

**Ignore unknown block types instead of crashing.** A mosque can paste an image
tomorrow, and a lesson that won't open is worse than one missing a picture.

## 7. Children's data

Most users are minors. This is a compliance constraint, not a preference.

- **No third-party analytics or ad SDKs.** Crash reporting via the existing
  Sentry org only.
- **In-app account deletion is mandatory** for both stores —
  `POST /api/v1/account/delete-request` exists; it must be reachable in the UI.
- Don't log names, usernames or any student data to the console in release
  builds.

## 8. Widgets — read before touching native config

Widgets are **native**, not React Native: SwiftUI/WidgetKit on iOS
(`@bacons/apple-targets`), Glance/RemoteViews on Android
(`react-native-android-widget`). Consequences that catch people out:

- **Expo Go cannot run this app.** Widgets require a prebuild and a
  development build. Use `expo-dev-client` from day one — do not start on
  Expo Go and migrate later.
- **A widget cannot call your JS or your API client.** It reads from shared
  native storage: an **App Group** on iOS, `SharedPreferences` on Android. So
  the app must *write* whatever the widget shows, whenever it changes.
- Keep the widget payload small and pre-formatted — write the display string,
  not raw data, so the widget never needs the i18n catalogue or a date
  formatter.
- Widgets refresh on the OS's schedule, not yours. Treat the shared payload as
  possibly stale and always include a timestamp.
- `app.config.ts` and the `ios/`/`android/` folders become build output once
  you prebuild. Configure through the config plugin; never hand-edit generated
  native files.

Likely first widgets, in priority order: **next session / today's homework**
for students, **today's attendance** for teachers.

## 9. Verification — what "done" means

- Ran on a **simulator or device**, not just typechecked. A screen that
  compiles is not a screen that works.
- Checked in **more than one locale**. German and Bosnian strings are much
  longer than English and break layouts.
- Checked **dark mode** — the web app supports it and users will expect it.
- For anything role-specific, signed in as **that role**, not as an admin.

## 10. Repo conventions

- `pnpm --filter mobile <script>` from the repo root, or work inside
  `apps/mobile`.
- Shared code lives in `packages/*` and is imported by name
  (`@mekteb/i18n`), never by a `../../..` path into another app.
- Don't add a dependency without checking it has a config plugin or is
  Expo-compatible — a package needing manual native linking will block the
  managed workflow.
