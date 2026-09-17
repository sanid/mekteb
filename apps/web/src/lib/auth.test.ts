import { describe, expect, it } from "vitest";

import { resolvePrimaryRole } from "./auth";

describe("resolvePrimaryRole", () => {
  it("returns 'none' for a user with no memberships and no student profile", () => {
    expect(resolvePrimaryRole([], false)).toBe("none");
  });

  it("returns 'student' for a user with only a student profile", () => {
    expect(resolvePrimaryRole([], true)).toBe("student");
  });

  it("prioritizes platform_owner over every other role", () => {
    const memberships = [
      { role: "parent" },
      { role: "teacher" },
      { role: "mosque_admin" },
      { role: "examiner" },
      { role: "platform_owner" },
    ];
    expect(resolvePrimaryRole(memberships, true)).toBe("platform_owner");
  });

  it("prioritizes mosque_admin over examiner, teacher, and parent", () => {
    const memberships = [
      { role: "parent" },
      { role: "teacher" },
      { role: "examiner" },
      { role: "mosque_admin" },
    ];
    expect(resolvePrimaryRole(memberships, false)).toBe("mosque_admin");
  });

  it("prioritizes teacher over examiner and parent", () => {
    const memberships = [
      { role: "parent" },
      { role: "teacher" },
      { role: "examiner" },
    ];
    expect(resolvePrimaryRole(memberships, false)).toBe("teacher");
  });

  it("sends examiner-only users to the examiner portal", () => {
    expect(resolvePrimaryRole([{ role: "examiner" }, { role: "parent" }], false)).toBe("examiner");
  });

  it("prioritizes teacher over parent", () => {
    const memberships = [{ role: "parent" }, { role: "teacher" }];
    expect(resolvePrimaryRole(memberships, false)).toBe("teacher");
  });

  it("treats assistant as teacher (assistants behave like teachers)", () => {
    expect(resolvePrimaryRole([{ role: "assistant" }], false)).toBe("teacher");
    expect(resolvePrimaryRole([{ role: "assistant" }, { role: "parent" }], false)).toBe("teacher");
    expect(resolvePrimaryRole([{ role: "assistant" }], true)).toBe("teacher");
  });

  it("returns 'parent' when only a parent membership is present", () => {
    expect(resolvePrimaryRole([{ role: "parent" }], false)).toBe("parent");
  });

  it("prefers an active membership role over a student profile", () => {
    expect(resolvePrimaryRole([{ role: "parent" }], true)).toBe("parent");
  });
});
