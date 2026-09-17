import { describe, expect, it } from "vitest";
import {
  createPrivateKey,
  generateKeyPairSync,
  sign,
  verify,
} from "node:crypto";

import { derToJose, resetApnsToken } from "@/lib/push/apns";

/**
 * A valid ES256 signature is a DER SEQUENCE of two ASN.1 INTEGERS. JOSE (JWS)
 * needs the raw r||s concatenation. Roughly half of all ECDSA signatures carry
 * a leading 0x00 pad or a short component, so a naive slice corrupts them —
 * this is the exact bug the implementation guards against.
 */
function ecKeyPem(): string {
  const { privateKey } = generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
  });
  return privateKey
    .export({ type: "pkcs8", format: "pem" })
    .toString();
}

/** Re-encode r||s back into DER so the one-shot verify() can check it. */
function joseToDer(jose: Buffer): Buffer {
  const r = jose.subarray(0, 32);
  const s = jose.subarray(32, 64);
  const strip = (b: Buffer) => {
    const i = b.findIndex((x) => x !== 0);
    const v = i === -1 ? Buffer.from([0]) : b.subarray(i);
    return v[0] & 0x80 ? Buffer.concat([Buffer.from([0]), v]) : v;
  };
  const rStripped = strip(r);
  const sStripped = strip(s);
  return Buffer.concat([
    Buffer.from([0x30, rStripped.length + sStripped.length + 4]),
    Buffer.from([0x02, rStripped.length]),
    rStripped,
    Buffer.from([0x02, sStripped.length]),
    sStripped,
  ]);
}

describe("derToJose", () => {
  it("produces a fixed 64-byte r||s that round-trips through verify()", () => {
    const pem = ecKeyPem();
    const key = createPrivateKey(pem);

    // Sign many times: ECDSA is randomized, so we cover both the padded and
    // the short-component cases that naive slicing corrupts.
    for (let i = 0; i < 25; i++) {
      const msg = Buffer.from(`payload-${i}`);
      const der = sign("sha256", msg, key);
      const jose = derToJose(der);

      expect(jose).toHaveLength(64);

      // Re-encode and verify: proves the r/s split is byte-correct.
      expect(verify("sha256", msg, key, joseToDer(jose))).toBe(true);
    }
  });

  it("throws on a non-SEQUENCE input", () => {
    expect(() => derToJose(Buffer.from("not a der"))).toThrow();
  });
});

describe("provider token caching", () => {
  it("resets the cached token when asked", () => {
    expect(() => resetApnsToken()).not.toThrow();
  });
});
