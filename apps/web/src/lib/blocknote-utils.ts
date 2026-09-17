/**
 * Extract plain text from BlockNote block array for use in previews.
 */
export function extractPlainText(blocks: unknown): string {
  if (!Array.isArray(blocks)) return "";
  const parts: string[] = [];

  for (const block of blocks) {
    if (!block || typeof block !== "object") continue;
    const b = block as Record<string, unknown>;

    // Extract text from inline content
    if (Array.isArray(b.content)) {
      for (const item of b.content) {
        if (item && typeof item === "object" && "text" in item) {
          parts.push(String((item as Record<string, unknown>).text ?? ""));
        }
      }
    }

    // Recurse into children
    if (Array.isArray(b.children)) {
      parts.push(extractPlainText(b.children));
    }
  }

  return parts.join(" ").trim();
}
