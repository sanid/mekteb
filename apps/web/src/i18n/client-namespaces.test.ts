import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { CLIENT_NAMESPACES } from "./client-namespaces";

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(name) && !name.endsWith(".test.ts")) out.push(p);
  }
  return out;
}

describe("CLIENT_NAMESPACES", () => {
  it("covers every namespace passed to useTranslations", () => {
    const used = new Set<string>();
    for (const file of walk(join(__dirname, ".."))) {
      const src = readFileSync(file, "utf8");
      expect(src, `${file} calls useTranslations() without a namespace`).not.toMatch(
        /useTranslations\(\s*\)/,
      );
      for (const m of src.matchAll(/useTranslations\(\s*"([^"]+)"\s*\)/g)) {
        used.add(m[1].split(".")[0]);
      }
    }
    const missing = [...used].filter((ns) => !(CLIENT_NAMESPACES as readonly string[]).includes(ns));
    expect(missing).toEqual([]);
  });
});
