import fs from "node:fs";
import path from "node:path";
import { Font } from "@react-pdf/renderer";

let registered = false;

/**
 * Register Noto Serif (Latin/Greek/Cyrillic subset). @react-pdf's built-in
 * Times/Helvetica don't include extended Latin glyphs (ć, š, ž, …) — that's
 * a PDF-spec limitation on the standard 14 fonts.
 *
 * Why data URLs? Turbopack selects @react-pdf/font's browser build for the
 * server bundle. That build only handles data URLs and remote URLs; a
 * filesystem path falls through to fetch() and fails. Data URLs work in
 * both the Node and browser builds.
 */
export function registerPdfFonts() {
  if (registered) return;
  const dir = path.join(process.cwd(), "public", "fonts");

  const dataUrl = (file: string) => {
    const buf = fs.readFileSync(path.join(dir, file));
    return `data:font/ttf;base64,${buf.toString("base64")}`;
  };

  Font.register({
    family: "Noto Serif",
    fonts: [
      { src: dataUrl("NotoSerif-Regular.ttf"), fontWeight: "normal" },
      { src: dataUrl("NotoSerif-Bold.ttf"), fontWeight: "bold" },
    ],
  });

  Font.register({
    family: "Noto Sans",
    fonts: [
      { src: dataUrl("NotoSans-Regular.ttf"), fontWeight: "normal" },
      { src: dataUrl("NotoSans-Bold.ttf"), fontWeight: "bold" },
    ],
  });

  registered = true;
}

/**
 * The registered PDF fonts only cover Latin/Greek/Cyrillic — Arabic ligatures
 * like ﷺ (U+FDFA) and ﷻ (U+FDFB) have no glyph and render as a fallback box.
 * Swap them for their common Latin transliterations before handing text to
 * @react-pdf so exported documents stay readable.
 */
const PDF_TEXT_FALLBACKS: Record<string, string> = {
  "ﷺ": "(s)",   // ﷺ — sallallahu alayhi wa sallam
  "ﷻ": "(swt)", // ﷻ — subhanahu wa ta'ala
};

export function sanitizePdfText(text: string): string {
  let result = text;
  for (const [from, to] of Object.entries(PDF_TEXT_FALLBACKS)) {
    result = result.split(from).join(to);
  }
  return result;
}
