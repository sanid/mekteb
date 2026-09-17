import { FlexWidget, TextWidget, type HexColor } from "react-native-android-widget";

import type { WidgetPayload } from "@/lib/widget-format";

/**
 * Android home-screen widget (open.md §3.4).
 *
 * Mirrors the iOS widget (`targets/widget/index.swift`) — the same headline,
 * lesson row and hifz bar — but it renders through `react-native-android-widget`,
 * which draws a RemoteViews layout from this JSX at render time. The strings
 * come from `widget-format.ts`, the single source of what a widget may say:
 * nothing is formatted here.
 *
 * Widgets cannot run the app's normal JS, so this tree must stay free of any
 * runtime dependency beyond `react-native-android-widget` primitives — no
 * hooks, no i18n lookups, no API calls. The payload arrives pre-translated.
 */

const ACCENT: HexColor = "#15803D"; // $accent in the iOS assets
const BACKGROUND_LIGHT: HexColor = "#FCFAF6";
const BACKGROUND_DARK: HexColor = "#0F1613";
const TEXT_LIGHT: HexColor = "#1C2420";
const TEXT_DARK: HexColor = "#F2F7F4";
const MUTED_LIGHT: HexColor = "#5C685F";
const MUTED_DARK: HexColor = "#809085";
const BAR_TRACK_LIGHT: HexColor = "#E6DFD3";
const BAR_TRACK_DARK: HexColor = "#1B2620";

const H_PADDING = 16;

type WidgetColors = {
  text: HexColor;
  muted: HexColor;
  track: HexColor;
  background: HexColor;
};

function colorsFor(dark: boolean): WidgetColors {
  return dark
    ? { text: TEXT_DARK, muted: MUTED_DARK, track: BAR_TRACK_DARK, background: BACKGROUND_DARK }
    : { text: TEXT_LIGHT, muted: MUTED_LIGHT, track: BAR_TRACK_LIGHT, background: BACKGROUND_LIGHT };
}

function Row({
  title,
  caption,
  colors,
}: {
  title: string;
  caption: string | null;
  colors: WidgetColors;
}) {
  return (
    <FlexWidget style={{ flexDirection: "column", flexGap: 1 }}>
      <TextWidget text={title} maxLines={2} truncate="END" style={{ fontSize: 14, fontWeight: "600", color: colors.text }} />
      {caption ? (
        <TextWidget text={caption} maxLines={1} truncate="END" style={{ fontSize: 11, color: colors.muted }} />
      ) : null}
    </FlexWidget>
  );
}

function HifzBar({
  hifz,
  colors,
  width,
}: {
  hifz: NonNullable<WidgetPayload["hifz"]>;
  colors: WidgetColors;
  /** Usable width in dp (widget width minus padding), for the fill bar. */
  width: number;
}) {
  const percent = Math.max(0, Math.min(100, hifz.percent));
  const fillWidth = Math.max(8, Math.round((width * percent) / 100));
  return (
    <FlexWidget style={{ flexDirection: "column", flexGap: 3 }}>
      <FlexWidget style={{ flexDirection: "row", flexGap: 4, alignItems: "center" }}>
        <TextWidget text={hifz.label} style={{ fontSize: 10, fontWeight: "600", color: colors.muted }} />
        <TextWidget text={hifz.value} maxLines={1} truncate="END" style={{ fontSize: 10, color: colors.muted }} />
      </FlexWidget>
      <FlexWidget style={{ height: 5, width: "match_parent", backgroundColor: colors.track, borderRadius: 3, overflow: "hidden" }}>
        <FlexWidget style={{ height: 5, width: fillWidth, backgroundColor: ACCENT, borderRadius: 3 }} />
      </FlexWidget>
    </FlexWidget>
  );
}

function WidgetBody({ payload, dark, width }: { payload: WidgetPayload; dark: boolean; width: number }) {
  const colors = colorsFor(dark);
  const items = payload.items.slice(0, 2);
  const usableWidth = Math.max(60, width - H_PADDING * 2);

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: "match_parent",
        width: "match_parent",
        backgroundColor: colors.background,
        padding: H_PADDING,
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <FlexWidget style={{ flexDirection: "column", flexGap: 8 }}>
        <Row title={payload.headline} caption={payload.headlineCaption} colors={colors} />
        {items.map((item, index) => (
          <Row key={index} title={item.title} caption={item.caption} colors={colors} />
        ))}
      </FlexWidget>

      <FlexWidget style={{ flexDirection: "column", flexGap: 6 }}>
        {payload.lessonValue ? (
          <FlexWidget style={{ flexDirection: "row", flexGap: 4, alignItems: "center" }}>
            <TextWidget text={payload.lessonLabel} style={{ fontSize: 10, fontWeight: "600", color: colors.muted }} />
            <TextWidget text={payload.lessonValue} maxLines={1} truncate="END" style={{ fontSize: 10, color: colors.text }} />
          </FlexWidget>
        ) : null}
        {payload.hifz ? <HifzBar hifz={payload.hifz} colors={colors} width={usableWidth} /> : null}
      </FlexWidget>
    </FlexWidget>
  );
}

/** Shown before anyone signs in — same "Mekteb / —" empty state as iOS. */
function EmptyState({ dark }: { dark: boolean }) {
  const colors = colorsFor(dark);
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: "match_parent",
        width: "match_parent",
        backgroundColor: colors.background,
        padding: H_PADDING,
        flexDirection: "column",
        justifyContent: "flex-start",
      }}
    >
      <TextWidget text="Mekteb" style={{ fontSize: 15, fontWeight: "bold", color: colors.text }} />
      <TextWidget text="—" style={{ fontSize: 13, color: colors.muted }} />
    </FlexWidget>
  );
}

export function MektebWidget({
  payload,
  dark = false,
  width = 250,
}: {
  payload: WidgetPayload | null;
  dark?: boolean;
  /** Widget width in dp — used to size the hifz fill bar. */
  width?: number;
}) {
  return payload ? <WidgetBody payload={payload} dark={dark} width={width} /> : <EmptyState dark={dark} />;
}
