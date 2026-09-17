import { describe, it, expect } from "vitest";

import {
  buildStudentEmail,
  isUsername,
  qualifiedUsername,
  resolveLoginEmail,
} from "@/lib/student-auth";

describe("resolveLoginEmail", () => {
  it("passes an email through, lowercased", () => {
    expect(resolveLoginEmail("Admin@Local.TEST")).toEqual({
      ok: true,
      email: "admin@local.test",
    });
  });

  it("resolves a mosque-qualified username", () => {
    expect(resolveLoginEmail("al-nour.amina")).toEqual({
      ok: true,
      email: "amina@students.al-nour.mekteb.de",
    });
  });

  it("is case-insensitive on both parts", () => {
    expect(resolveLoginEmail("Al-Nour.Amina")).toEqual({
      ok: true,
      email: "amina@students.al-nour.mekteb.de",
    });
  });

  it("keeps hyphens and underscores in usernames", () => {
    expect(resolveLoginEmail("al-nour.amina_h-2015")).toEqual({
      ok: true,
      email: "amina_h-2015@students.al-nour.mekteb.de",
    });
  });

  // The whole point of the subdomain fallback: existing students who only
  // ever type "amina" on al-nour.mekteb.de must keep working.
  it("accepts a bare username when the subdomain supplies the mosque", () => {
    expect(resolveLoginEmail("amina", "al-nour")).toEqual({
      ok: true,
      email: "amina@students.al-nour.mekteb.de",
    });
  });

  it("rejects a bare username with no mosque anywhere", () => {
    expect(resolveLoginEmail("amina")).toEqual({
      ok: false,
      reason: "mosque_missing",
    });
  });

  it("prefers the typed mosque over the subdomain", () => {
    // A qualified login is explicit; it should not be silently rewritten to
    // whichever subdomain the request happened to arrive on.
    expect(resolveLoginEmail("al-nour.amina", "other-mosque")).toEqual({
      ok: true,
      email: "amina@students.al-nour.mekteb.de",
    });
  });

  it("refuses to guess when there are several dots", () => {
    expect(resolveLoginEmail("a.b.c")).toEqual({ ok: false, reason: "malformed" });
  });

  it("rejects empty halves", () => {
    expect(resolveLoginEmail(".amina")).toEqual({ ok: false, reason: "malformed" });
    expect(resolveLoginEmail("al-nour.")).toEqual({ ok: false, reason: "malformed" });
  });

  it("trims surrounding whitespace", () => {
    expect(resolveLoginEmail("  al-nour.amina  ")).toEqual({
      ok: true,
      email: "amina@students.al-nour.mekteb.de",
    });
  });
});

describe("buildStudentEmail / qualifiedUsername", () => {
  it("round-trips: the qualified form resolves to the same address", () => {
    const email = buildStudentEmail("amina", "al-nour");
    const viaQualified = resolveLoginEmail(qualifiedUsername("amina", "al-nour"));
    expect(viaQualified).toEqual({ ok: true, email });
  });

  it("lowercases the slug as well as the username", () => {
    expect(buildStudentEmail("Amina", "Al-Nour")).toBe(
      "amina@students.al-nour.mekteb.de",
    );
  });
});

describe("isUsername", () => {
  it("distinguishes usernames from emails", () => {
    expect(isUsername("amina")).toBe(true);
    expect(isUsername("al-nour.amina")).toBe(true);
    expect(isUsername("a@b.test")).toBe(false);
  });
});
