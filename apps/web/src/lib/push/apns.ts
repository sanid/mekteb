import http2, { type ClientHttp2Stream, type ClientHttp2Session } from "node:http2";
import { createPrivateKey, sign } from "node:crypto";

/**
 * APNs delivery.
 *
 * Apple's HTTP/2 provider API. Auth is a short-lived ES256 JWT signed with a
 * .p8 auth key (`kid` = key id, `iss` = team id) rather than a per-device
 * certificate. The .p8 is passed in as the literal PEM string via env so it
 * never needs to touch a filesystem in production.
 *
 * Env:
 *  - APNS_KEY_ID   — the 10-char key id (e.g. KTGX5CS8MH)
 *  - APNS_TEAM_ID  — the developer team id
 *  - APNS_KEY      — the full .p8 PEM text (BEGIN/END PRIVATE KEY lines)
 *  - APNS_BUNDLE   — topic, defaults to de.mekteb.app
 *  - APNS_ENV      — "production" | "sandbox" (defaults to production)
 *
 * A token minted by a sandbox build 400s against the production host and vice
 * versa (`BadDeviceToken`). `APNS_ENV` selects the host, so a dev build and a
 * release build are simply different deploys of the same route.
 */

const PRODUCTION_HOST = "api.push.apple.com";
const SANDBOX_HOST = "api.sandbox.push.apple.com";

export type ApnsResult =
  | { ok: true }
  | { ok: false; reason: "unregistered" | "invalid_token" | "http" | "error"; message: string };

type ApnsConfig = {
  keyId: string;
  teamId: string;
  privateKey: string;
  topic: string;
  host: string;
};

function loadConfig(): ApnsConfig | null {
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const privateKey = process.env.APNS_KEY;
  if (!keyId || !teamId || !privateKey) return null;
  return {
    keyId,
    teamId,
    privateKey,
    topic: process.env.APNS_BUNDLE ?? "de.mekteb.app",
    host: process.env.APNS_ENV === "sandbox" ? SANDBOX_HOST : PRODUCTION_HOST,
  };
}

let cachedToken: { jwt: string; expiresAt: number } | null = null;

/** Resets the cached provider token (used by tests to force a re-sign). */
export function resetApnsToken(): void {
  cachedToken = null;
}

/**
 * ES256 JWT for APNs. Valid for up to an hour; cache and refresh hourly so the
 * cron does not re-sign on every push.
 */
/**
 * Converts a DER-encoded ECDSA signature to the raw r||s form JWS requires.
 *
 * DER wraps each integer in `02 <len> <value>` with a leading 0x00 when the
 * high bit is set — which happens for roughly half of all signatures. A naive
 * `subarray(0,32)/subarray(len-32)` slice silently corrupts those. P-256 means
 * exactly 32 bytes per component.
 */
export function derToJose(der: Buffer): Buffer {
  // der: 30 <len> 02 <rlen> <r> 02 <slen> <s>
  let offset = 0;
  if (der[offset] !== 0x30) throw new Error("not a DER SEQUENCE");
  offset += 2; // 0x30 + length byte (P-256 signatures are <128 so single byte)
  const readInt = (): Buffer => {
    if (der[offset] !== 0x02) throw new Error("not a DER INTEGER");
    const len = der[offset + 1];
    let value = der.subarray(offset + 2, offset + 2 + len);
    offset += 2 + len;
    if (value.length > 32) value = value.subarray(value.length - 32); // strip 0x00 pad
    if (value.length < 32) value = Buffer.concat([Buffer.alloc(32 - value.length), value]); // left-pad
    return value;
  };
  return Buffer.concat([readInt(), readInt()]);
}

function providerToken(config: ApnsConfig): string {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt > now + 60) return cachedToken.jwt;

  const header = Buffer.from(
    JSON.stringify({ alg: "ES256", kid: config.keyId }),
  ).toString("base64url");
  const claims = Buffer.from(
    JSON.stringify({ iss: config.teamId, iat: now }),
  ).toString("base64url");

  const key = createPrivateKey(config.privateKey);
  const der = sign("sha256", Buffer.from(`${header}.${claims}`), key);

  const signature = derToJose(der).toString("base64url");
  const jwt = `${header}.${claims}.${signature}`;
  cachedToken = { jwt, expiresAt: now + 3600 };
  return jwt;
}

function streamResult(stream: ClientHttp2Stream): Promise<ApnsResult> {
  return new Promise((resolve) => {
    stream.on("response", (headers) => {
      const status = Number(headers[":status"] ?? 0);
      if (status === 200) {
        resolve({ ok: true });
        stream.close();
        return;
      }
      let body = "";
      stream.on("data", (chunk: Buffer) => {
        body += chunk.toString();
      });
      stream.on("end", () => {
      let reason: "unregistered" | "invalid_token" | "http" = "http";
        // 410 means the device no longer has the app / token is stale — the
        // token must be removed from device_tokens or it will be re-pushed.
        if (status === 410) reason = "unregistered";
        // 400 BadDeviceToken / BadDeviceToken with a reason — token is wrong
        // for this topic/device. Not worth retrying.
        else if (status === 400 && /BadDeviceToken|DeviceTokenNotForTopic/.test(body))
          reason = "invalid_token";
        else if (status === 403) reason = "http"; // provider token expired/unauthorized
        resolve({
          ok: false,
          reason,
          message: `APNs ${status}: ${body.slice(0, 200)}`,
        });
      });
    });
    stream.on("error", (err) => {
      resolve({ ok: false, reason: "error", message: String(err) });
    });
  });
}

export async function sendApns(
  deviceToken: string,
  payload: { title: string; body: string; data?: Record<string, string> },
): Promise<ApnsResult> {
  const config = loadConfig();
  if (!config) {
    return { ok: false, reason: "error", message: "APNs not configured (missing APNS_KEY_ID/APNS_TEAM_ID/APNS_KEY)" };
  }

  const jwt = providerToken(config);

  return new Promise((resolve) => {
    const session: ClientHttp2Session = http2.connect(`https://${config.host}`);
    const req = session.request({
      [":method"]: "POST",
      [":path"]: `/3/device/${deviceToken}`,
      [":scheme"]: "https",
      [":authority"]: config.host,
      authorization: `bearer ${jwt}`,
      "apns-topic": config.topic,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "apns-expiration": "0",
    });

    req.on("error", (err) => {
      session.destroy();
      resolve({ ok: false, reason: "error", message: String(err) });
    });

    streamResult(req).then((result) => {
      session.destroy();
      resolve(result);
    });

    req.end(
      JSON.stringify({
        aps: { alert: { title: payload.title, body: payload.body }, "thread-id": payload.data?.threadId },
        ...payload.data,
      }),
    );
  });
}
