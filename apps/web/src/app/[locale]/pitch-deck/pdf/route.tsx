import { renderToBuffer } from "@react-pdf/renderer";

import { buildPitchDeckDoc } from "@/lib/pitch-deck-pdf";

export const dynamic = "force-dynamic";

/**
 * The public pitch-deck PDF — a marketing asset for mosque communities and
 * Islamic schools, so deliberately not behind `requireAdmin`. German content
 * is baked into the deck itself (the app is German-first); the locale segment
 * keeps the URL consistent with the rest of the app.
 */
export async function GET() {
  const doc = buildPitchDeckDoc();
  const buffer = await renderToBuffer(doc);
  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="mekteb-pitch-deck.pdf"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
