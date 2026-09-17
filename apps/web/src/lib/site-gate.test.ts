import { afterEach, describe, expect, it, vi } from "vitest";

import {
  checkGatePassword,
  gateIsEnabled,
  hasGateAccess,
} from "./site-gate";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("site gate", () => {
  describe("with no password configured", () => {
    it("is disabled, so the public site is reachable", () => {
      vi.stubEnv("SITE_GATE_PASSWORD", "");
      expect(gateIsEnabled()).toBe(false);
      expect(hasGateAccess(undefined)).toBe(true);
    });

    it("treats whitespace as unset — a stray space must not lock everyone out", () => {
      vi.stubEnv("SITE_GATE_PASSWORD", "   ");
      expect(gateIsEnabled()).toBe(false);
      expect(hasGateAccess(undefined)).toBe(true);
    });
  });

  describe("with a password configured", () => {
    it("refuses a visitor with no cookie", () => {
      vi.stubEnv("SITE_GATE_PASSWORD", "open-sesame");
      expect(gateIsEnabled()).toBe(true);
      expect(hasGateAccess(undefined)).toBe(false);
    });

    it("accepts the cookie minted from the right password", () => {
      vi.stubEnv("SITE_GATE_PASSWORD", "open-sesame");
      const token = checkGatePassword("open-sesame");
      expect(token).toBeTruthy();
      expect(hasGateAccess(token!)).toBe(true);
    });

    it("rejects the wrong password", () => {
      vi.stubEnv("SITE_GATE_PASSWORD", "open-sesame");
      expect(checkGatePassword("open-sesamf")).toBeNull();
      expect(checkGatePassword("")).toBeNull();
    });

    /**
     * The regression this file exists for: the old gate stored the password in
     * the cookie and compared the two verbatim, so anyone could grant
     * themselves access from the browser console with one `document.cookie`.
     */
    it("does not accept the password itself as a cookie value", () => {
      vi.stubEnv("SITE_GATE_PASSWORD", "open-sesame");
      expect(hasGateAccess("open-sesame")).toBe(false);
    });

    it("invalidates existing cookies when the password is rotated", () => {
      vi.stubEnv("SITE_GATE_PASSWORD", "open-sesame");
      const token = checkGatePassword("open-sesame")!;

      vi.stubEnv("SITE_GATE_PASSWORD", "new-secret");
      expect(hasGateAccess(token)).toBe(false);
      expect(hasGateAccess(checkGatePassword("new-secret")!)).toBe(true);
    });
  });
});
