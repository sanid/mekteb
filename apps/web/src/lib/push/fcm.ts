import { createPrivateKey, sign } from "node:crypto";

/**
 * FCM delivery, HTTP v1 API.
 *
 * Auth is a Google OAuth2 access token minted from a service-account JSON key:
 * sign a JWT (RS256) with the account's private key, exchange it at
 * oauth2.googleapis.com/token for an hour-long access token, then POST the
 * message to fcm.googleapis.com/v1/projects/<project>/messages:send.
 *
 * Env:
 *  - FCM_SERVICE_ACCOUNT — the full service-account JSON text (the "Generate
 *    new private key" download from Firebase → Project settings → Service
 *    accounts). Needs the `Firebase Cloud Messaging Admin` role.
 *  - FCM_PROJECT_ID      — optional; falls back to the `project_id` inside the
 *    service account JSON.
 *
 * The Android *app* side additionally needs `google-services.json` in
 * apps/mobile/ and `googleServicesFile` in app.config.ts — the client cannot
 * register an FCM token without it (ExpoFirebaseMessagingService is already in
 * the merged manifest).
 */

export type FcmResult =
  | { ok: true }
  | { ok: false; reason: "unregistered" | "invalid_token" | "http" | "error"; message: string };

type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

function loadServiceAccount(): ServiceAccount | null {
  const raw = process.env.FCM_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ServiceAccount;
  } catch {
    return null;
  }
}

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

/** OAuth2 access token for FCM, refreshed shortly before expiry. */
async function accessToken(account: ServiceAccount): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && cachedAccessToken.expiresAt > now + 60) {
    return cachedAccessToken.token;
  }

  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const claims = Buffer.from(
    JSON.stringify({
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  ).toString("base64url");

  const key = createPrivateKey(account.private_key);
  const signature = sign("sha256", Buffer.from(`${header}.${claims}`), key).toString("base64url");
  const jwt = `${header}.${claims}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) return null;
  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) return null;
  cachedAccessToken = { token: json.access_token, expiresAt: now + (json.expires_in ?? 3600) };
  return cachedAccessToken.token;
}

export async function sendFcm(
  deviceToken: string,
  payload: { title: string; body: string; data?: Record<string, string> },
): Promise<FcmResult> {
  const account = loadServiceAccount();
  if (!account) {
    return {
      ok: false,
      reason: "error",
      message: "FCM not configured (missing FCM_SERVICE_ACCOUNT)",
    };
  }

  const token = await accessToken(account);
  if (!token) {
    return { ok: false, reason: "error", message: "Could not mint FCM access token" };
  }

  const projectId = process.env.FCM_PROJECT_ID ?? account.project_id;

  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token: deviceToken,
          notification: { title: payload.title, body: payload.body },
          data: payload.data ?? {},
          android: { priority: "high" },
        },
      }),
    },
  );

  const body = await res.text();
  if (res.ok) return { ok: true };

  // UNREGISTERED / INVALID_ARGUMENT with a bad token means the row is stale.
  if (res.status === 404 || /UNREGISTERED|INVALID_ARGUMENT/.test(body)) {
    return { ok: false, reason: "unregistered", message: `FCM ${res.status}: ${body.slice(0, 200)}` };
  }
  return { ok: false, reason: "http", message: `FCM ${res.status}: ${body.slice(0, 200)}` };
}
