# App Store Screenshots — spec

Store screenshots must come from the **mobile app** (simulator or device), not
the web demo. Capture in **German**, with sample data, on the newest device
sizes, then upload to ASC which accepts up to 10 per size.

## Required sizes

| Device | Size | When |
|--------|------|------|
| iPhone 6.9″ (iPhone 16 Pro Max) | 1320 × 2868 | **required** |
| iPhone 6.5″ (iPhone 11 Pro Max) | 1242 × 2688 | required |
| iPhone 6.1″ (iPhone 16 Pro) | 1206 × 2622 | recommended |
| iPad Pro 13″ | 2064 × 2752 | optional (app supports tablet) |
| iPad 12.9″ | 2048 × 2732 | optional |

Capture with a real screenshot tool (simulator ⌘S is fine) — do **not** upscale
a smaller image; Apple rejects fuzzy screenshots.

## Screens (German, sample data)

1. **Start / Kalender** — the home screen with greeting, next lesson card.
2. **Gruppen** — teacher group list (`/teacher` equivalent in the app).
3. **Hausaufgaben** — student homework list with due dates.
4. **Anwesenheit** — attendance grid with status pills.
5. **Nachrichten** — a thread with a short exchange.
6. **Koran** — the Quran reader with a surah open.

If the app has a demo/seed path, prefer it; otherwise log in with the seeded
`teacher@local.test` / `amina@...` accounts (see `MEMORY.md §2`).

## Tips

- Re-check **dark mode**: store screenshots should match the app's default
  light theme; Apple shows what you upload regardless.
- Keep the status bar and home indicator clean (no notifications clutter).
- Use one real mosque's look via the seeded `dev-mosque` if possible.
