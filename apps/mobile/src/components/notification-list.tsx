import { useCallback, useEffect, useRef } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";

import { api } from "@/lib/api";
import { invalidate, useResource } from "@/lib/resource";
import { useLiveNotifications } from "@/lib/realtime";
import { useSession } from "@/lib/session-context";
import { formatDate, tm } from "@/lib/i18n";
import { notificationText } from "@/lib/notification-text";
import type { NotificationItem, NotificationPage } from "@/lib/types";
import { Card, EmptyState, ErrorNotice, FirstLoad } from "@/components/ui";
import { Icon } from "@/components/icon";
import { radius, space, usePalette } from "@/theme";

/**
 * The notification feed — the same one the web portals show, for every role.
 *
 * A component rather than a screen since the inbox pairs it with announcements
 * behind one switch. It keeps its own data and mark-read behaviour so the two
 * halves of that screen stay independent: opening the inbox on the
 * announcements tab must not silently mark notifications read.
 *
 * Opening it marks everything read, exactly as the web inbox does: a list that
 * stays bold after you have read it is just a permanently wrong badge. The
 * unread styling reflects the state *as it arrived*, so this render still
 * shows what was new.
 */
export function NotificationList({
  onOpenAnnouncement,
}: {
  /** Announcements live one tab away, not one screen away. */
  onOpenAnnouncement: () => void;
}) {
  const palette = usePalette();
  const router = useRouter();
  const { session } = useSession();

  const { data, error, refreshing, refresh } = useResource<NotificationPage>(
    "notifications",
    useCallback(
      () => api<NotificationPage>("/notifications", { query: { limit: 50 } }),
      [],
    ),
    { fallbackError: tm("notificationsLoadFailed") },
  );

  useLiveNotifications(session?.userId, () => {
    void refresh();
    // The header badge counts unread rows.
    invalidate("home");
  });

  // Once per visit, not once per render: `data` is replaced by every background
  // revalidation, and marking read again on each of those would be a request
  // per focus for nothing.
  const marked = useRef(false);
  const unread = data?.notifications.some((n) => !n.is_read) ?? false;
  useEffect(() => {
    if (marked.current || !unread) return;
    marked.current = true;
    void api("/notifications", { method: "PUT" })
      .then(() => {
        // The header badge counts unread rows; it is now wrong.
        invalidate("home");
      })
      .catch(() => {
        // A failed mark-read is invisible and self-healing — the next visit
        // tries again. Never surface it over someone's inbox.
        marked.current = false;
      });
  }, [unread]);

  if (!data) return <FirstLoad error={error} />;

  const open = (n: NotificationItem) => {
    if (n.template_key === "written_test.new") {
      const token =
        (n.template_params as Record<string, unknown> | null)?.token;
      if (typeof token === "string") {
        router.push(`/(app)/written-test/${token}`);
        return;
      }
    }
    if (n.thread_id) router.push(`/(app)/messages/${n.thread_id}`);
    else if (n.source_announcement_id) onOpenAnnouncement();
  };

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

      {data.notifications.length === 0 ? (
        <EmptyState icon="notifications">{tm("noNotifications")}</EmptyState>
      ) : (
        data.notifications.map((n, i) => {
          const tappable = !!(
            n.thread_id ||
            n.source_announcement_id ||
            n.template_key === "written_test.new"
          );
          // The database stores English; this is the reader's language.
          const text = notificationText(n);
          return (
            <Animated.View
              key={n.id}
              entering={FadeInDown.delay(Math.min(i, 8) * 40).duration(220)}
            >
              <Card onPress={tappable ? () => open(n) : undefined}>
                <View
                  style={{ flexDirection: "row", alignItems: "flex-start", gap: space.sm }}
                >
                  {/* An unread dot beside the title, rather than bold text:
                      German subjects wrap to two lines and a weight change is
                      easy to miss on the second one. */}
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      marginTop: 6,
                      borderRadius: radius.pill,
                      backgroundColor: n.is_read ? "transparent" : palette.accent,
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: n.is_read ? "600" : "800",
                        color: palette.foreground,
                      }}
                    >
                      {text.subject || tm("notificationNoSubject")}
                    </Text>
                    <Text style={{ color: palette.faint, fontSize: 12, marginTop: 2 }}>
                      {formatDate(n.created_at, {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                    {text.body ? (
                      <Text
                        style={{
                          color: palette.muted,
                          fontSize: 14,
                          lineHeight: 20,
                          marginTop: space.sm,
                        }}
                      >
                        {text.body}
                      </Text>
                    ) : null}
                  </View>
                  {tappable ? (
                    <Icon name="chevron" size={18} color={palette.faint} />
                  ) : null}
                </View>
              </Card>
            </Animated.View>
          );
        })
      )}
    </ScrollView>
  );
}
