import { useState } from "react";
import { View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { hasPlugin, hasRole } from "@/lib/session";
import { useSession } from "@/lib/session-context";
import { tm } from "@/lib/i18n";
import { AnnouncementList } from "@/components/announcement-list";
import { NotificationList } from "@/components/notification-list";
import { Button, SegmentedTabs } from "@/components/ui";
import { space, usePalette } from "@/theme";

/**
 * One inbox, two feeds.
 *
 * Notifications and announcements were separate screens reached from separate
 * cards, which put two versions of "what's new" in two places and neither on
 * the way to the other. They are the same errand, so they are now one screen
 * with a switch — reached from the header, not from a card in the middle of
 * the dashboard.
 *
 * `?tab=` lets a push notification open the half it is about.
 */
type Tab = "notifications" | "announcements";

export default function InboxScreen() {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useSession();
  const { tab } = useLocalSearchParams<{ tab?: string }>();

  const hasNotifications = hasPlugin(session, "notifications");
  const hasAnnouncements = hasPlugin(session, "announcements");

  // A mosque can run either plugin without the other, so the opening tab is
  // whichever one actually exists before it is whatever the link asked for.
  const [active, setActive] = useState<Tab>(() => {
    if (tab === "announcements" && hasAnnouncements) return "announcements";
    if (tab === "notifications" && hasNotifications) return "notifications";
    return hasNotifications ? "notifications" : "announcements";
  });

  const options: { value: Tab; label: string }[] = [
    ...(hasNotifications
      ? [{ value: "notifications" as const, label: tm("notifications") }]
      : []),
    ...(hasAnnouncements
      ? [{ value: "announcements" as const, label: tm("announcements") }]
      : []),
  ];

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: palette.background,
        paddingHorizontal: space.xl,
        paddingBottom: insets.bottom,
      }}
    >
      <Stack.Screen options={{ title: tm("inbox") }} />

      {/* One feed on its own needs no switch — the title already says which. */}
      {options.length > 1 ? (
        <SegmentedTabs
          options={options}
          value={active}
          onChange={setActive}
          style={{ marginVertical: space.md }}
        />
      ) : (
        <View style={{ height: space.md }} />
      )}

      {active === "notifications" ? (
        <NotificationList onOpenAnnouncement={() => setActive("announcements")} />
      ) : (
        <>
          {/*
            Teachers write as well as read: compose and manage their own
            announcements from the same feed. Admin-only mosques still use
            the web panel — the API here is the teacher route.
          */}
          {hasRole(session, "teacher") ? (
            <View style={{ flexDirection: "row", gap: space.md, marginBottom: space.md }}>
              <Button
                label={tm("newAnnouncement")}
                icon="announcements"
                variant="outline"
                haptic="none"
                onPress={() => router.push("/(app)/announcements/new")}
                style={{ flex: 1 }}
              />
              <Button
                label={tm("myAnnouncements")}
                variant="ghost"
                haptic="none"
                onPress={() => router.push("/(app)/announcements")}
                style={{ flex: 1 }}
              />
            </View>
          ) : null}
          <AnnouncementList />
        </>
      )}
    </View>
  );
}
