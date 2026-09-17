import { requireOptionalNativeModule } from "expo-modules-core";
import { registerWidgetTaskHandler, type WidgetTaskHandlerProps } from "react-native-android-widget";

import type { WidgetPayload } from "@/lib/widget-format";
import { MektebWidget } from "./MektebWidget";

/**
 * Android widget task handler (open.md §3.4).
 *
 * `react-native-android-widget` runs this headless task whenever the OS wants
 * the widget drawn (added, updated, resized). It reads the payload the app
 * last wrote into SharedPreferences via the native `WidgetBridge` module and
 * renders it — light and dark variants, so the OS picks the one that matches
 * the system theme, exactly as the iOS widget's color assets do.
 *
 * The widget renders in both themes on every update; the strings are the same
 * either way because `widget-format.ts` already translated them.
 *
 * `registerWidgetTaskHandler` must run at bundle load, so this module is
 * imported (for its side effect) from `app/_layout.tsx`.
 */

type WidgetBridge = {
  isAvailable: () => boolean;
  getPayload: () => string | null;
};

const bridge = requireOptionalNativeModule<WidgetBridge>("WidgetBridge");

function readPayload(): WidgetPayload | null {
  try {
    const raw = bridge?.getPayload();
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WidgetPayload;
    // Guard against a payload written by a future version with missing fields.
    if (!parsed || typeof parsed.headline !== "string") return null;
    return parsed;
  } catch {
    // Garbage in storage (crash between write and commit) renders the empty
    // state rather than failing the whole widget.
    return null;
  }
}

async function widgetTaskHandler({
  widgetInfo,
  widgetAction,
  renderWidget,
}: WidgetTaskHandlerProps): Promise<void> {
  if (widgetAction === "WIDGET_DELETED") return;

  const payload = readPayload();
  // Widget width in dp — the hifz fill bar sizes itself against it.
  const width = widgetInfo.width;
  renderWidget({
    light: <MektebWidget payload={payload} dark={false} width={width} />,
    dark: <MektebWidget payload={payload} dark width={width} />,
  });
}

registerWidgetTaskHandler(widgetTaskHandler);
