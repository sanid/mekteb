import { View } from "react-native";
import { Stack, usePathname } from "expo-router";

import { TabBar, type TabRoute } from "@/components/tab-bar";
import { usePalette } from "@/theme";

/**
 * `usePathname` reports the route without the `(app)` group, so `/homework`
 * rather than `/(app)/homework`. Anything deeper — `/lessons/12`, `/groups/3`
 * — is a detail screen pushed on top of a tab and gets no bar of its own.
 */
function activeTab(pathname: string): TabRoute | null {
  switch (pathname) {
    case "/":
      return "/(app)";
    case "/homework":
      return "/(app)/homework";
    case "/children":
      return "/(app)/children";
    case "/lessons":
      return "/(app)/lessons";
    case "/messages":
      return "/(app)/messages";
    case "/quran":
      return "/(app)/quran";
    default:
      return null;
  }
}

export default function AppLayout() {
  const palette = usePalette();
  const pathname = usePathname();
  const active = activeTab(pathname);

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: palette.surface },
          headerTintColor: palette.foreground,
          headerTitleStyle: { fontWeight: "700" },
          contentStyle: { backgroundColor: palette.background },
        }}
      >
        {/*
          The home screen draws its own greeting header and pads for the
          status bar itself; the stack header on top of that was the stray
          "Index" title. Every other screen sets its own `title` and keeps
          the header for the back button.
        */}
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>

      {active ? <TabBar active={active} /> : null}
    </View>
  );
}
