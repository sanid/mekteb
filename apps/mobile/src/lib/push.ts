import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

import { api } from "./api";
import { getLocale } from "./i18n";

/**
 * Push registration.
 *
 * The app registers a **native** APNs / FCM token (`getDevicePushTokenAsync`),
 * not an Expo push token: `/api/v1/devices` and the `device_tokens` table were
 * written for raw provider tokens, and an Expo token would need an EAS project
 * and route delivery through Expo's servers — a third party holding push
 * payloads about children, which is not a decision to make silently.
 *
 * Nothing here throws at the caller. A user who declined notifications, a
 * simulator (which has no APNs token at all), or a device that is offline must
 * all reach the app exactly as before.
 */

/** The last token this launch registered — needed to deregister on sign-out. */
let registeredToken: string | null = null;

/**
 * Foreground behaviour. Without this a notification that arrives while the app
 * is open is delivered silently, and a parent watching the screen sees nothing.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    // Deprecated alias, still required by the type.
    shouldShowAlert: true,
  }),
});

async function ensurePermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  // `canAskAgain` false means the user said no in Settings; asking again there
  // is a no-op that returns denied, so skip the round trip.
  if (!existing.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/**
 * Registers this device for push, idempotently.
 *
 * Call on every launch with a session: **push tokens rotate** (AGENTS.md §5),
 * and the endpoint upserts on `(user_id, token)`, so re-registering the same
 * token only refreshes `last_seen_at`.
 */
export async function registerForPush(): Promise<void> {
  // A simulator has no push token; asking produces an error, not a token.
  if (!Device.isDevice) return;

  try {
    if (Platform.OS === "android") {
      // Android 8+ drops notifications that arrive with no channel.
      await Notifications.setNotificationChannelAsync("default", {
        name: "Mekteb",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    if (!(await ensurePermission())) return;

    const token = await Notifications.getDevicePushTokenAsync();
    if (typeof token.data !== "string") return;

    await api("/devices", {
      method: "POST",
      body: {
        platform: Platform.OS === "ios" ? "ios" : "android",
        token: token.data,
        bundleId: Constants.expoConfig?.ios?.bundleIdentifier ?? undefined,
        appVersion: Constants.expoConfig?.version ?? undefined,
        deviceModel: Device.modelName ?? undefined,
        // So a server-side sender can localise the payload rather than
        // shipping whatever language the row happens to have been written in.
        locale: getLocale(),
      },
    });
    registeredToken = token.data;
  } catch {
    // Push is an enhancement. A failure here must never block the app or show
    // an error over content the user asked for.
  }
}

/**
 * Drops this device's token, on sign-out.
 *
 * On a shared family phone the next person to sign in must not keep receiving
 * the previous user's notifications — the token stays the same, only the row
 * linking it to a user is removed.
 */
export async function unregisterFromPush(): Promise<void> {
  if (!registeredToken) return;
  try {
    await api("/devices", { method: "DELETE", body: { token: registeredToken } });
  } catch {
    // Best effort: the sign-out itself must still complete.
  } finally {
    registeredToken = null;
  }
}

/**
 * Where a tapped notification should take the user.
 *
 * The payload's `data` is written by whatever sends the push; anything it does
 * not recognise falls back to the inbox, which is never wrong.
 */
export type NotificationRoute =
  | `/(app)/messages/${string}`
  | `/(app)/written-test/${string}`
  | "/(app)/inbox?tab=announcements"
  | "/(app)/inbox";

export function routeForNotification(data: unknown): NotificationRoute {
  const payload = (data ?? {}) as {
    threadId?: unknown;
    announcementId?: unknown;
    // The written-test row stores the token in template params, and the push
    // sender mirrors it into the payload so a tap opens the test directly.
    writtenTestToken?: unknown;
  };
  if (typeof payload.threadId === "string") {
    return `/(app)/messages/${payload.threadId}`;
  }
  if (typeof payload.writtenTestToken === "string") {
    return `/(app)/written-test/${payload.writtenTestToken}`;
  }
  // Both land on the inbox; the parameter picks which half of it opens.
  if (typeof payload.announcementId === "string") return "/(app)/inbox?tab=announcements";
  return "/(app)/inbox";
}
