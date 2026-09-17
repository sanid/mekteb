import { afterEach, describe, expect, it, vi } from "vitest";

import { createClient } from "@/lib/supabase/server";
import { getSchoolYearStart } from "./school-year";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

function mockSupabaseResult(data: { school_year_start: string } | null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ from });
  return { from, select, eq, maybeSingle };
}

describe("getSchoolYearStart", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("returns the mosque's configured school_year_start when set", async () => {
    mockSupabaseResult({ school_year_start: "2024-09-15" });

    const result = await getSchoolYearStart("mosque-1");

    expect(result).toBe("2024-09-15");
  });

  it("falls back to September 1 of the current year when now is on/after Sept 1", async () => {
    mockSupabaseResult(null);
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 15)); // Oct 15, 2026

    const result = await getSchoolYearStart("mosque-1");

    expect(result).toBe("2026-09-01");
  });

  it("falls back to September 1 of the previous year when now is before Sept 1", async () => {
    mockSupabaseResult(null);
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 15)); // Mar 15, 2026

    const result = await getSchoolYearStart("mosque-1");

    expect(result).toBe("2025-09-01");
  });

  it("queries the mosques table scoped by mosque id", async () => {
    const { from, eq } = mockSupabaseResult({ school_year_start: "2024-09-01" });

    await getSchoolYearStart("mosque-123");

    expect(from).toHaveBeenCalledWith("mosques");
    expect(eq).toHaveBeenCalledWith("id", "mosque-123");
  });
});
