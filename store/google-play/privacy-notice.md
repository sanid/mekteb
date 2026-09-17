# Google Play — Data safety declaration

Google Play requires a "Data safety" form. Base the answers on what the app
actually collects — same facts as the iOS privacy labels.

## Declare (collected)

| Data type | Collected | Purpose | Shared? |
|-----------|-----------|---------|---------|
| Email address | Yes (account) | App functionality | No |
| Name | Yes (profile) | App functionality | No |
| Phone number | Yes (profile, optional) | App functionality | No |
| User IDs | Yes (account) | App functionality | No |
| Device or other IDs | Yes (push token) | App functionality | No |
| Purchase history | Yes (subscriptions via Stripe) | App functionality | No |
| User content — messages | Yes | App functionality | No |
| User content — files/photos (lesson images, homework attachments) | Yes | App functionality | No |
| App crash info | No third-party SDK; native OS reports only | — | — |

## Do not declare

- **Location** — the app never asks for location (prayer times use a
  manually entered city, not GPS).
- **Contacts** — never reads the address book.
- **Audio** — playback only; the mic permission is explicitly off
  (`recordAudioAndroid: false`, `microphonePermission: false`).
- **Advertising / tracking** — no ad SDKs, no cross-app tracking.
- **Selling data** — not sold.

## Answer the form

1. **Data types collected**: tick the six rows above.
2. **Encryption**: data is encrypted in transit (TLS) and at rest.
3. **Data deletion**: users can delete their account in-app
   (`POST /api/v1/account/delete-request`); GDPR deletion supported.
4. **Security practices**: the app uses Google Play Protect (default), no
   custom certification is claimed.

This mirrors `app-store/privacy-nutrition-labels.json` — keep both in sync if
the app's data collection ever changes.
