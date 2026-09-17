import { Image, Text, View } from "react-native";

import { resolveAssetUrl } from "@/lib/api";
import type { LessonBlock } from "@/lib/types";
import { space, usePalette } from "@/theme";

/**
 * Renders BlockNote lesson content natively.
 *
 * `docs/ios.md` recommended a WebView for this. Querying the real data showed
 * only four block types across every lesson — paragraph, heading (levels 2-3),
 * bulletListItem, numberedListItem — all with plain-text content and no inline
 * styles. A WebView would have cost native scrolling, text selection, font
 * scaling and dark mode for nothing.
 *
 * Unknown block types are skipped rather than thrown on: a mosque can paste an
 * image tomorrow, and a lesson that won't open is worse than one missing a
 * picture (AGENTS.md §6).
 */
export function LessonBody({ blocks }: { blocks: LessonBlock[] }) {
  const palette = usePalette();

  const textOf = (b: LessonBlock) =>
    (b.content ?? [])
      .map((c) => c.text ?? "")
      .join("")
      .trim();

  return (
    <View style={{ gap: space.md }}>
      {blocks.map((block, i) => {
        const content = textOf(block);

        switch (block.type) {
          case "heading": {
            const level = Number(block.props?.level ?? 2);
            return (
              <Text
                key={i}
                accessibilityRole="header"
                style={{
                  fontSize: level <= 2 ? 20 : 17,
                  fontWeight: "700",
                  color: palette.foreground,
                  marginTop: i === 0 ? 0 : space.sm,
                }}
              >
                {content}
              </Text>
            );
          }

          case "paragraph":
            // BlockNote emits empty paragraphs as spacing; don't render a gap
            // twice.
            if (!content) return null;
            return (
              <Text
                key={i}
                style={{ fontSize: 15, lineHeight: 23, color: palette.foreground }}
              >
                {content}
              </Text>
            );

          case "bulletListItem":
            return (
              <View key={i} style={{ flexDirection: "row", gap: space.md, paddingLeft: space.xs }}>
                <Text style={{ color: palette.accent, fontSize: 15, lineHeight: 23 }}>•</Text>
                <Text
                  style={{ flex: 1, fontSize: 15, lineHeight: 23, color: palette.foreground }}
                >
                  {content}
                </Text>
              </View>
            );

          case "numberedListItem": {
            // Numbering restarts whenever a non-list block interrupts the run.
            const previousNonList = blocks
              .slice(0, i)
              .findLastIndex((item) => item.type !== "numberedListItem");
            const listIndex = i - previousNonList;
            return (
              <View key={i} style={{ flexDirection: "row", gap: space.md, paddingLeft: space.xs }}>
                <Text
                  style={{
                    color: palette.accent,
                    fontSize: 15,
                    lineHeight: 23,
                    fontWeight: "700",
                    minWidth: 18,
                  }}
                >
                  {listIndex}.
                </Text>
                <Text
                  style={{ flex: 1, fontSize: 15, lineHeight: 23, color: palette.foreground }}
                >
                  {content}
                </Text>
              </View>
            );
          }

          case "image": {
            const url = String(block.props?.url ?? "");
            const caption = String(block.props?.caption ?? "");
            if (!url) return null;
            const resolvedUrl = resolveAssetUrl(url);
            return (
              <View key={i} style={{ marginVertical: space.sm, alignItems: "center", width: "100%" }}>
                <Image
                  source={{ uri: resolvedUrl }}
                  style={{
                    width: "100%",
                    aspectRatio: 4 / 3,
                    borderRadius: 12,
                    backgroundColor: palette.card,
                  }}
                  resizeMode="contain"
                  accessibilityLabel={caption || "Lektionsbild"}
                />
                {caption ? (
                  <Text
                    style={{
                      fontSize: 13,
                      lineHeight: 18,
                      color: palette.muted,
                      marginTop: space.xs,
                      textAlign: "center",
                      fontStyle: "italic",
                    }}
                  >
                    {caption}
                  </Text>
                ) : null}
              </View>
            );
          }

          default:
            return null;
        }
      })}
    </View>
  );
}
