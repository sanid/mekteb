# Push Notifications — operational guide

Native push (APNs for iOS, FCM for Android) is **fully implemented**. This
document covers what exists, what still needs your credentials, and how to
verify it works.

## What already exists (all committed)

| Piece | Location |
|-------|----------|
| Server route (batches `notification_queue`, sends via APNs/FCM, deletes dead tokens) | `apps/web/src/app/api/notifications/send-push/route.ts` |
| APNs HTTP/2 client (ES256 `.p8` JWT) | `apps/web/src/lib/push/apns.ts` |
| FCM v1 client (service-account OAuth2) | `apps/web/src/lib/push/fcm.ts` |
| Localised payload builder (title/body per device locale) | `apps/web/src/lib/push/payload.ts` (+ tests) |
| Cron registration (daily 08:00 + 20:00, retry backstop) | `apps/web/vercel.json` |
| Instant delivery trigger (fires `pg_net` webhook on insert) | `supabase/migrations/20260812000002_push_webhook_trigger.sql` |
| `pushed_at` tracking column + index | `supabase/migrations/20260812000001_notification_push_tracking.sql` |
| Mobile registration / deregistration / tap-routing | `apps/mobile/src/lib/push.ts` |
| Device-token API (upsert + delete) | `apps/web/src/app/api/v1/devices/route.ts` |
| Vercel env (APNS_* + PUSH_WEBHOOK_SECRET) | set in production |

The `pg_net` extension is enabled (confirmed on the local stack) and the local
`app.push_webhook_config` row already points at
`http://host.docker.internal:3000/api/notifications/send-push`.

## What is blocked on your accounts

| Credential | For | How to create |
|------------|-----|---------------|
| Apple APNs `.p8` key (`APNS_KEY`, `APNS_KEY_ID`, `APNS_TEAM_ID`) | iOS | Apple Developer → Certificates/Keys → Keys → tick *Apple Push Notifications service (APNs)* → download `.p8`. Already set in Vercel production. |
| Firebase service account (`FCM_SERVICE_ACCOUNT`) | Android | Firebase console → Project settings → Service accounts → *Generate new private key*. Grant *Cloud Messaging Admin* role. |
| `google-services.json` | Android client | Firebase console → Project settings → *Your apps* → add Android app with package `de.mekteb.app`. Place in `apps/mobile/`. |

No server code changes are required for either platform — everything reads from
env vars.

## Production setup steps

1. **Seed the production webhook config** so pushes go out the instant a
   notification lands (not just twice a day). In Supabase SQL editor:

   ```sql
   -- ONE row, id = 1. URL = your deployed route, secret = the PUSH_WEBHOOK_SECRET
   -- you set in Vercel. Same value, so the route accepts it.
   insert into app.push_webhook_config (id, url, secret)
   values (1, 'https://mekteb.de/api/notifications/send-push', '${PUSH_WEBHOOK_SECRET}')
   on conflict (id) do update set url = excluded.url, secret = excluded.secret;
   ```

   A snippet lives at `supabase/snippets/setup_push_webhook.sql`.

2. **Verify the trigger is live**: insert a row into `notification_queue` and
   watch the logs for the webhook POST to `/api/notifications/send-push`.

3. **Test the cron** directly:

   ```bash
   curl -X POST https://mekteb.de/api/notifications/send-push \
     -H "Authorization: Bearer ${CRON_SECRET}"
   # → {"processed":0,"pushed":0,"devices":0,"failed":0}
   ```

4. **iOS**: sign in on a real device (simulators have no APNs token), grant
   notification permission, then trigger any notification (message,
   announcement, homework). `APNS_ENV=sandbox` is set for dev builds — a
   TestFlight build's token is valid against the sandbox host; a production
   build needs `APNS_ENV=production`.

5. **Android**: drop `google-services.json` into `apps/mobile/`, rebuild the
   dev client (prebuild re-runs), then repeat the same test. Without the file
   the app cannot even register an FCM token.

## Behaviour notes (from the code)

- A dead token (APNs `410 Unregistered`, FCM `UNREGISTERED`/`INVALID_ARGUMENT`)
  deletes the `device_tokens` row so it is never re-pushed.
- Transient failures (APNs 503, FCM rate limits) leave the row pending for the
  next cron tick.
- The payload is rendered in the **device's** locale (`device_tokens.locale`),
  and the tap opens the right screen: message thread, written test, or
  announcements inbox.
- Push permission is only ever asked for on a real device, once, and a decline
  never breaks the rest of the app.
