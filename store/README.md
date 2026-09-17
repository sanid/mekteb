# Store Readiness — Mekteb

Submission materials for the Apple App Store and Google Play.

**Primary language: German.** All store copy is written German-first; English
metadata is included for App Store Connect (Apple requires at least one
English localization). Bump the app version to `1.0.0` for the first release
(currently `0.1.0` in `apps/mobile/app.config.ts` and `apps/mobile/package.json`).

```
store/
├── README.md                        # this file — the submission checklist
├── app-store/
│   ├── metadata-de.md               # App Store Connect — German (primary)
│   ├── metadata-en.md               # App Store Connect — English (secondary)
│   ├── privacy-nutrition-labels.json  # privacy declaration, ready for `asc web privacy apply`
│   └── screenshots.md               # which screens to capture, at what size
└── google-play/
    ├── listing-de.md                # Play listing — German (primary)
    └── privacy-notice.md            # Play data-safety declaration
```

---

## Submission checklist

### 1. App Store Connect (iOS)

| # | Item | Status | Where |
|---|------|--------|-------|
| 1 | Create the app (`de.mekteb.app`, SKU `mekteb`) | pending | `asc-app-create-ui` skill / Blitz |
| 2 | App metadata (name, subtitle, description, keywords) | prepared | `app-store/metadata-de.md` |
| 3 | Privacy nutrition labels | prepared | `app-store/privacy-nutrition-labels.json` |
| 4 | Screenshots (6.9″ + 6.5″ iPhone) | **to capture** | `app-store/screenshots.md` |
| 5 | App icon 1024² | exists | `apps/mobile/assets/icon.png` (generated) |
| 6 | App Privacy policy URL | exists | `https://mekteb.de/de/privacy` |
| 7 | Support URL | exists | `https://mekteb.de/de/impressum` |
| 8 | Bundle / signing (team `Z98U7RY93M`) | needs Apple account | — |
| 9 | APNs push key (`.p8`) | set in Vercel | see `docs/push-notifications.md` |
| 10 | In-app account deletion | reachable | `POST /api/v1/account/delete-request` |

### 2. Google Play (Android)

| # | Item | Status | Where |
|---|------|--------|-------|
| 1 | Play listing (German) | prepared | `google-play/listing-de.md` |
| 2 | Data-safety declaration | prepared | `google-play/privacy-notice.md` |
| 3 | FCM service account + `google-services.json` | **to create** | see `docs/push-notifications.md` |
| 4 | App icon + feature graphic | icon exists; graphic needed | `apps/mobile/assets/` |
| 5 | Screenshots (phone + 7″ tablet) | **to capture** | reuse `app-store/screenshots.md` sizes |
| 6 | Android signing keystore | **needs creation** | EAS credentials |

### 3. Before submit

- [ ] Run the verification debt in `MEMORY.md §5` (esp. Android has never run).
- [ ] Walk every role on a simulator: German + one other locale, dark mode.
- [ ] Bump version to `1.0.0` and the iOS build number / Android version code.
- [ ] TestFlight external review build; Android internal test track.
- [ ] Privacy labels must match what the binary actually sends — re-check after
      any analytics are added.
