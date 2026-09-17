#!/usr/bin/env node
/**
 * Validates every internal portal href in the source against the actual
 * App Router file tree.
 *
 * This exists because `/admin/written-tests/{id}` shipped as a dead link:
 * nothing type-checks an href string against the routes that exist, and a
 * 404 is only visible if someone happens to click that button.
 *
 * Run: node scripts/check-routes.mjs   (wired into `pnpm check:routes`)
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const APP_DIR = "src/app/[locale]";
const PORTALS = ["admin", "teacher", "parent", "student", "examiner", "platform-admin"];

/** Collects routes from the file tree, normalising dynamic segments to `:id`. */
function collectRoutes(dir, segment = "", out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name.startsWith("_")) continue;
      // Route groups `(name)` do not contribute a path segment.
      const next = entry.name.startsWith("(")
        ? segment
        : `${segment}/${entry.name.startsWith("[") ? ":id" : entry.name}`;
      collectRoutes(path.join(dir, entry.name), next, out);
    } else if (/^(page|route)\.(tsx|ts)$/.test(entry.name)) {
      out.push(segment || "/");
    }
  }
  return out;
}

const routes = new Set(collectRoutes(APP_DIR));

// Every href literal pointing at a portal path, with interpolations collapsed.
const grep = `grep -rhoE 'href=\\{?["\`]/(${PORTALS.join("|")})[^"\`]*' src/app src/components --include='*.tsx'`;
const hrefs = new Set(
  execSync(grep, { encoding: "utf8" })
    .split("\n")
    .filter(Boolean)
    .map((line) =>
      line
        .replace(/^href=\{?["`]/, "")
        .replace(/\$\{[^}]*\}/g, ":id"),
    ),
);

const dead = [...hrefs].filter((href) => {
  const clean = href.split("?")[0].split("#")[0].replace(/\/$/, "");
  return !routes.has(clean);
});

if (dead.length > 0) {
  console.error(`\n❌ ${dead.length} href(s) point at routes that do not exist:\n`);
  for (const href of dead.sort()) console.error(`   ${href}`);
  console.error("");
  process.exit(1);
}

console.log(`✅ all ${hrefs.size} internal portal hrefs resolve to real routes (${routes.size} routes)`);
