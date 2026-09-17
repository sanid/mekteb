import fs from "fs";
import path from "path";

const LOCALES = ["de", "en", "bs", "tr"];
// The catalogue is shared with the mobile app, so it lives in a workspace
// package rather than inside apps/web.
const MESSAGES_DIR = path.resolve("../../packages/i18n/messages");

function flattenKeys(obj, prefix = "") {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      keys.push(...flattenKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function loadLocale(locale) {
  const filePath = path.join(MESSAGES_DIR, `${locale}.json`);
  const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  return new Set(flattenKeys(content));
}

const enKeys = loadLocale("en");
let hasErrors = false;

for (const locale of LOCALES) {
  if (locale === "en") continue;
  const localeKeys = loadLocale(locale);

  const missing = [...enKeys].filter((k) => !localeKeys.has(k));
  const extra = [...localeKeys].filter((k) => !enKeys.has(k));

  if (missing.length > 0) {
    hasErrors = true;
    console.log(`\n❌ ${locale}: missing ${missing.length} keys (present in en):`);
    for (const k of missing.sort()) console.log(`  - ${k}`);
  }
  if (extra.length > 0) {
    console.log(`\n⚠️  ${locale}: extra ${extra.length} keys (not in en):`);
    for (const k of extra.sort()) console.log(`  + ${k}`);
  }
  if (missing.length === 0 && extra.length === 0) {
    console.log(`✅ ${locale}: all keys match en (${localeKeys.size} keys)`);
  }
}

console.log(`\n📊 en: ${enKeys.size} keys total`);
if (hasErrors) process.exit(1);
