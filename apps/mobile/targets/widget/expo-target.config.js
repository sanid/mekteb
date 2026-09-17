/**
 * The iOS widget extension, generated into the Xcode project by
 * `@bacons/apple-targets` during prebuild. Never hand-edit `ios/` — it is
 * regenerated (AGENTS.md §8).
 *
 * The App Group is the whole point: it is the only channel between the app and
 * the widget, and both sides must be entitled to the same one.
 */
/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: "widget",
  name: "Widget",
  icon: "../../assets/icon.png",
  entitlements: {
    "com.apple.security.application-groups": ["group.de.mekteb.app"],
  },
  colors: {
    // Matches the accent in src/theme/tokens.ts.
    $accent: "#15803d",
    $widgetBackground: { light: "#ffffff", dark: "#18181b" },
  },
  deploymentTarget: "16.0",
};
