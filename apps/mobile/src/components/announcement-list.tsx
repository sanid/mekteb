import { useCallback } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { api } from "@/lib/api";
import { useResource } from "@/lib/resource";
import { formatDate, tm } from "@/lib/i18n";
import type { Announcement } from "@/lib/types";
import { Card, Chip, EmptyState, ErrorNotice, FirstLoad } from "@/components/ui";
import { space, usePalette } from "@/theme";

/**
 * The mosque's announcements — the same feed for every role; `/announcements`
 * already narrows to what the caller may see (mosque-wide, plus the groups
 * they teach, attend, or parent into), with RLS on top.
 *
 * Read-only by design: creating announcements is an admin/teacher web task.
 */
export function AnnouncementList() {
  const palette = usePalette();

  const {
    data: items,
    error,
    refreshing,
    refresh,
  } = useResource<Announcement[]>(
    "announcements",
    useCallback(() => api<Announcement[]>("/announcements"), []),
    { fallbackError: tm("announcementsLoadFailed") },
  );

  if (items === null) return <FirstLoad error={error} />;

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ gap: space.md, paddingBottom: space.xxl }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          tintColor={palette.muted}
        />
      }
    >
      {error ? <ErrorNotice message={error} /> : null}

      {items.length === 0 ? (
        <EmptyState icon="announcements">{tm("noAnnouncements")}</EmptyState>
      ) : (
        items.map((a, i) => (
          <Animated.View
            key={a.id}
            entering={FadeInDown.delay(Math.min(i, 8) * 40).duration(220)}
          >
            <Card>
              <View
                style={{ flexDirection: "row", alignItems: "flex-start", gap: space.sm }}
              >
                <Text
                  style={{
                    flex: 1,
                    fontSize: 16,
                    fontWeight: "700",
                    color: palette.foreground,
                  }}
                >
                  {a.title}
                </Text>
                <Chip
                  label={a.audience === "group" ? tm("audienceGroup") : tm("audienceMosque")}
                />
              </View>

              <Text style={{ color: palette.faint, fontSize: 12, marginTop: 4 }}>
                {/* Falls back to `created_at`: a published row can carry a null
                    `published_at` when it was published by an older code
                    path. */}
                {formatDate(a.published_at ?? a.created_at, {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </Text>

              {a.body ? (
                <Text
                  style={{
                    color: palette.muted,
                    fontSize: 14,
                    lineHeight: 21,
                    marginTop: space.sm,
                  }}
                >
                  {a.body}
                </Text>
              ) : null}
            </Card>
          </Animated.View>
        ))
      )}
    </ScrollView>
  );
}
