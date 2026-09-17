import { Pressable, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { hasPlugin, hasRole } from "@/lib/session";
import { useSession } from "@/lib/session-context";
import { tm } from "@/lib/i18n";
import { radius, space, usePalette } from "@/theme";
import { Icon, type IconName } from "./icon";

export type TabRoute =
  | "/(app)"
  | "/(app)/lessons"
  | "/(app)/homework"
  | "/(app)/children"
  | "/(app)/messages"
  | "/(app)/quran";

type Tab = { route: TabRoute; icon: IconName; label: string };

/**
 * The tabs a given user actually gets. Role and plugin gating happen here so
 * the bar never advertises a screen the API would refuse (AGENTS.md §0.2) —
 * a student with the hifz plugin off has no Quran tab at all.
 */
export function useTabs(): Tab[] {
  const { session } = useSession();
  const tabs: Tab[] = [{ route: "/(app)", icon: "home", label: tm("home") }];

  if (hasRole(session, "student")) {
    // A separate, shorter label than the screen title: "Hausaufgaben" is the
    // right word for a heading but truncates to "Hausaufgab…" in a five-tab
    // bar, which is worse than naming the tab "Aufgaben".
    tabs.push({ route: "/(app)/homework", icon: "homework", label: tm("navHomework") });
    if (hasPlugin(session, "lesson_library")) {
      tabs.push({ route: "/(app)/lessons", icon: "lessons", label: tm("lessons") });
    }
    // Attendance moved to a card on the home screen when messaging took a tab.
    // Five is this bar's ceiling, and of the two, "write to my teacher" is a
    // daily errand while "look back at my attendance record" is a monthly one.
  }

  if (hasRole(session, "parent")) {
    tabs.push({ route: "/(app)/children", icon: "children", label: tm("children") });
    // The lesson library is member-wide on web (parent/lessons exists); the
    // same published-library API now serves both roles, so the tab is gated
    // on the plugin rather than the role.
    if (hasPlugin(session, "lesson_library")) {
      tabs.push({ route: "/(app)/lessons", icon: "lessons", label: tm("lessons") });
    }
  }

  // Messaging is member-wide rather than role-specific — the endpoints are
  // guarded by `requireApiMember`, so everyone with the plugin gets the tab.
  if (hasPlugin(session, "messaging")) {
    tabs.push({ route: "/(app)/messages", icon: "messages", label: tm("messages") });
  }

  /**
   * The Quran tab is for everyone, not just students and not gated on
   * `quran_hifz` — the web reader has no plugin gate either, and scripture is
   * not a per-mosque feature. Only the hifz progress *inside* it is gated,
   * since that is the part a mosque records.
   */
  tabs.push({ route: "/(app)/quran", icon: "quran", label: tm("quran") });

  return tabs;
}

export function TabBar({ active }: { active: TabRoute }) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const tabs = useTabs();

  // One destination is not a navigation choice — showing a single tab would
  // just be chrome. Teachers currently land here.
  if (tabs.length < 2) return null;

  return (
    <View
      style={{
        flexDirection: "row",
        paddingTop: space.sm,
        paddingBottom: insets.bottom || space.sm,
        paddingHorizontal: space.sm,
        backgroundColor: palette.surface,
        borderTopWidth: 1,
        borderTopColor: palette.cardBorder,
      }}
    >
      {tabs.map((tab) => {
        const selected = tab.route === active;
        return (
          <Pressable
            key={tab.route}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={tab.label}
            onPress={() => {
              if (selected) return;
              void Haptics.selectionAsync();
              // `navigate` rather than `push` so the tabs stay a flat set
              // instead of stacking a new screen on every switch.
              router.navigate(tab.route);
            }}
            style={({ pressed }) => ({
              flex: 1,
              alignItems: "center",
              gap: 2,
              paddingVertical: space.sm,
              borderRadius: radius.md,
              backgroundColor: selected ? palette.accentSubtle : "transparent",
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Icon
              name={tab.icon}
              size={20}
              color={selected ? palette.accent : palette.faint}
              strokeWidth={selected ? 2.2 : 1.8}
            />
            <Text
              numberOfLines={1}
              style={{
                fontSize: 12,
                fontWeight: selected ? "800" : "600",
                color: selected ? palette.accent : palette.muted,
              }}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
