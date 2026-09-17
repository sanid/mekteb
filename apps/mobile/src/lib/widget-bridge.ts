import { requireOptionalNativeModule } from "expo-modules-core";

import type { WidgetPayload } from "./widget";

/**
 * The one place that touches the native widget storage.
 *
 * `requireOptionalNativeModule`, not `requireNativeModule`: the module is part
 * of the native build, so **every dev client built before the widgets existed
 * has no idea what `WidgetBridge` is**. Requiring it would crash those builds
 * on launch. Missing simply means "this build has no widgets", which is a fact
 * about the binary, not an error to show anyone.
 */
type WidgetBridge = {
  isAvailable: () => boolean;
  setPayload: (json: string | null) => Promise<boolean>;
};

const bridge = requireOptionalNativeModule<WidgetBridge>("WidgetBridge");

/** True when this build can actually feed a widget. */
export function widgetsSupported(): boolean {
  try {
    return !!bridge?.isAvailable();
  } catch {
    // A module present but without the App Group entitlement.
    return false;
  }
}

/** Writes the payload, or clears it when given `null`. */
export async function writeWidgetPayload(payload: WidgetPayload | null): Promise<void> {
  if (!bridge) return;
  await bridge.setPayload(payload === null ? null : JSON.stringify(payload));
}
