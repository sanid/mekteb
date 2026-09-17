import { describe, expect, it } from "vitest";

import { computeExamResult, parseExamDate } from "./exam-scheduling";

describe("parseExamDate", () => {
  it("accepts a valid YYYY-MM-DD string", () => {
    expect(parseExamDate("2026-09-01")).toBe("2026-09-01");
  });

  it("trims surrounding whitespace", () => {
    expect(parseExamDate("  2026-09-01  ")).toBe("2026-09-01");
  });

  it("rejects null", () => {
    expect(parseExamDate(null)).toBeNull();
  });

  it("rejects an empty string", () => {
    expect(parseExamDate("")).toBeNull();
  });

  it("rejects malformed dates", () => {
    expect(parseExamDate("01.09.2026")).toBeNull();
    expect(parseExamDate("2026/09/01")).toBeNull();
    expect(parseExamDate("not-a-date")).toBeNull();
  });
});

describe("computeExamResult", () => {
  it("fails when no part is required", () => {
    expect(
      computeExamResult({
        oralRequired: false,
        oralPassed: true,
        writtenRequired: false,
        writtenPassed: true,
      }),
    ).toBe("failed");
  });

  it("passes when the only required part passed", () => {
    expect(
      computeExamResult({
        oralRequired: true,
        oralPassed: true,
        writtenRequired: false,
        writtenPassed: false,
      }),
    ).toBe("passed");
  });

  it("fails when the only required part failed", () => {
    expect(
      computeExamResult({
        oralRequired: false,
        oralPassed: false,
        writtenRequired: true,
        writtenPassed: false,
      }),
    ).toBe("failed");
  });

  it("requires both parts to pass when both are required", () => {
    expect(
      computeExamResult({
        oralRequired: true,
        oralPassed: true,
        writtenRequired: true,
        writtenPassed: false,
      }),
    ).toBe("failed");

    expect(
      computeExamResult({
        oralRequired: true,
        oralPassed: true,
        writtenRequired: true,
        writtenPassed: true,
      }),
    ).toBe("passed");
  });
});
