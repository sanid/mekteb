import { describe, expect, it } from "vitest";

import { dayOfWeekFromDateStr, toLocalDateStr } from "./date-utils";

describe("toLocalDateStr", () => {
  it("formats a date as YYYY-MM-DD using local components", () => {
    expect(toLocalDateStr(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("pads single-digit months and days", () => {
    expect(toLocalDateStr(new Date(2026, 8, 1))).toBe("2026-09-01");
  });
});

describe("dayOfWeekFromDateStr", () => {
  it("returns the correct day of week for a date string", () => {
    // 2026-06-15 is a Monday
    expect(dayOfWeekFromDateStr("2026-06-15")).toBe(1);
  });

  it("treats the date as local, not UTC", () => {
    // 2026-01-01 is a Thursday
    expect(dayOfWeekFromDateStr("2026-01-01")).toBe(4);
  });
});
