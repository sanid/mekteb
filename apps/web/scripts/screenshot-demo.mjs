import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const OUT = path.join(ROOT, "assets", "screenshots");
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const LOCALE = process.env.SCREENSHOT_LOCALE ?? "de";
const VIEWPORT_W = 1440;
const VIEWPORT_H = 900;

const ROLES = {
  admin: "Admin",
  teacher: "Lehrer",
  parent: "Elternteil",
  student: "Schüler",
  examiner: "Prüfer",
  "platform-admin": "Plattform-Admin",
};

const HIDE_BANNER = ".bg-amber-500{display:none!important}";
const SETTLE_MS = 800;
const HIDE_ANIM = "*{transition:none!important;animation:none!important;scroll-behavior:auto!important}";

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: VIEWPORT_W, height: VIEWPORT_H },
  deviceScaleFactor: 2,
  colorScheme: "light",
});

await page.addStyleTag({ content: HIDE_ANIM });
await page.goto(`${BASE}/${LOCALE}/demo`, { waitUntil: "networkidle" });

let bannerHidden = false;
const hideBanner = async () => {
  if (!bannerHidden) {
    await page.addStyleTag({ content: HIDE_BANNER });
    bannerHidden = true;
  }
};

for (const [roleDir, roleLabel] of Object.entries(ROLES)) {
  if (bannerHidden) {
    await page.reload({ waitUntil: "networkidle" });
    bannerHidden = false;
  }
  const roleButton = page
    .locator("div.bg-amber-500")
    .getByRole("button", { name: roleLabel, exact: true });
  await roleButton.click();
  await hideBanner();
  await page.waitForTimeout(SETTLE_MS);

  const labels = await page.locator("aside nav button").allInnerTexts();
  const navButtons = page.locator("aside nav button");
  const roleOut = path.join(OUT, roleDir);
  await mkdir(roleOut, { recursive: true });

  for (let i = 0; i < labels.length; i++) {
    const label = labels[i].trim();
    await navButtons.nth(i).click();
    await page.waitForTimeout(SETTLE_MS);
    const slug = `${String(i + 1).padStart(2, "0")}-${slugify(label) || "view"}`;
    await page.screenshot({ path: path.join(roleOut, `${slug}.png`), fullPage: true });
    console.log(`saved ${roleDir}/${slug}.png  (${label})`);
  }
}

await browser.close();
console.log(`done -> ${OUT}`);
