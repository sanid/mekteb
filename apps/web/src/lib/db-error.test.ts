import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

import { sanitizeDbCode, sanitizeDbMessage, GENERIC_DB_ERROR } from "@/lib/db-error";
import { actionOk, actionErr } from "@/lib/action-result";

describe("sanitizeDbCode", () => {
  it("classifies RLS violations without echoing the table", () => {
    const raw = 'new row violates row-level security policy for table "group_enrollments"';
    expect(sanitizeDbCode(raw)).toBe("permission_denied");
    expect(sanitizeDbMessage(raw)).not.toContain("group_enrollments");
  });

  it("classifies an email collision from the constraint name", () => {
    expect(sanitizeDbCode('duplicate key value violates unique constraint "profiles_email_key"'))
      .toBe("account_email_exists");
  });

  it("does not call every unique violation an email collision", () => {
    // Regression: a duplicate group category reported "An account with this
    // email already exists." because the pattern matched any unique violation.
    const raw = 'duplicate key value violates unique constraint "group_categories_mosque_id_name_key"';
    expect(sanitizeDbCode(raw)).toBe("value_already_in_use");
    expect(sanitizeDbMessage(raw)).not.toMatch(/email/i);
  });

  it("collapses unknown driver text rather than leaking it", () => {
    const raw = 'syntax error at or near "SELCT" in schema app';
    expect(sanitizeDbCode(raw)).toBe("unexpected_error");
    expect(sanitizeDbMessage(raw)).toBe(GENERIC_DB_ERROR);
    expect(sanitizeDbMessage(raw)).not.toContain("SELCT");
  });

  it("handles a missing message", () => {
    expect(sanitizeDbCode(undefined)).toBe("unexpected_error");
  });
});

describe("action-result contract", () => {
  it("actionOk carries data only when given", () => {
    expect(actionOk()).toEqual({ ok: true });
    expect(actionOk("abc")).toEqual({ ok: true, data: "abc" });
  });

  it("actionErr passes an already-safe message through", () => {
    expect(actionErr("Not authorised")).toEqual({ error: "Not authorised" });
  });
});

describe("error message catalogue", () => {
  // apps/web — for source files
  const root = path.resolve(__dirname, "../..");
  // repo root — the message catalogue is a workspace package
  const repoRoot = path.resolve(__dirname, "../../../..");
  const locales = ["en", "de", "bs", "tr"] as const;
  const messages = Object.fromEntries(
    locales.map((l) => [
      l,
      JSON.parse(fs.readFileSync(path.join(repoRoot, `packages/i18n/messages/${l}.json`), "utf8")),
    ]),
  );

  it("every ErrorCode in the union has a message in all four locales", () => {
    const src = fs.readFileSync(path.join(root, "src/lib/action-errors.ts"), "utf8");
    const union = src.slice(src.indexOf("export type ErrorCode"), src.indexOf("/** Resolves"));
    const codes = [...union.matchAll(/"([a-z0-9_]+)"/g)].map((m) => m[1]);
    expect(codes.length).toBeGreaterThan(50);

    for (const locale of locales) {
      const missing = codes.filter((c) => !messages[locale].Errors?.[c]);
      expect(missing, `missing in ${locale}`).toEqual([]);
    }
  });

  it("every DbErrorCode has a db_-prefixed message in all four locales", () => {
    const src = fs.readFileSync(path.join(root, "src/lib/db-error.ts"), "utf8");
    const union = src.slice(src.indexOf("export type DbErrorCode"), src.indexOf("const KNOWN_PATTERNS"));
    const codes = [...union.matchAll(/"([a-z0-9_]+)"/g)].map((m) => m[1]);
    expect(codes.length).toBeGreaterThan(5);

    for (const locale of locales) {
      const missing = codes.filter((c) => !messages[locale].Errors?.[`db_${c}`]);
      expect(missing, `missing in ${locale}`).toEqual([]);
    }
  });
});
