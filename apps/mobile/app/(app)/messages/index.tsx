import { useCallback } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

import { api } from "@/lib/api";
import { useResource } from "@/lib/resource";
import { useLiveMessages } from "@/lib/realtime";
import { tm } from "@/lib/i18n";
import { useSession } from "@/lib/session-context";
import type { MessageThreadPage } from "@/lib/types";
import {
  chatTimestamp,
  otherParticipants,
  participantName,
} from "@/lib/messaging";
import { Avatar, Card, EmptyState, ErrorNotice, FirstLoad } from "@/components/ui";
import { radius, space, usePalette } from "@/theme";

export default function MessagesScreen() {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useSession();

  const { data, error, refreshing, refresh } = useResource<MessageThreadPage>(
    "messages/threads",
    useCallback(
      () => api<MessageThreadPage>("/messages/threads", { query: { limit: 50 } }),
      [],
    ),
    { fallbackError: tm("messagesLoadFailed") },
  );

  // No thread id: RLS limits delivery to conversations this user is in.
  useLiveMessages(undefined, () => void refresh());

  const header = (
    <Stack.Screen
      options={{
        title: tm("messages"),
        headerRight: () => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tm("newChat")}
            onPress={() => router.push("/(app)/messages/new")}
            hitSlop={12}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            <Text style={{ fontSize: 24, color: palette.accent, fontWeight: "700" }}>
              ＋
            </Text>
          </Pressable>
        ),
      }}
    />
  );

  if (!data) {
    return (
      <>
        {header}
        <FirstLoad error={error} />
      </>
    );
  }

  return (
    <>
      {header}
      <ScrollView
        style={{ flex: 1, backgroundColor: palette.background }}
        contentContainerStyle={{
          padding: space.xl,
          gap: space.md,
          paddingBottom: insets.bottom + space.xxl,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={palette.muted}
          />
        }
      >
        {error ? <ErrorNotice message={error} /> : null}

        {data.threads.length === 0 ? (
          <EmptyState icon="messages">{tm("noThreads")}</EmptyState>
        ) : (
          data.threads.map((thread, i) => {
            const others = otherParticipants(thread, session?.userId);
            const title =
              thread.subject || others.map((p) => participantName(p.name)).join(", ");
            const me = thread.participants.find(
              (p) => p.profile_id === session?.userId,
            );
            /* Unread means the thread moved after I last opened it. A thread I
               have never opened (`last_read_at` null) counts as unread — but
               only if someone else wrote last, or my own new thread would come
               back at me marked unread. */
            const mine = thread.lastMessage?.author_profile_id === session?.userId;
            const unread =
              !mine && (!me?.last_read_at || me.last_read_at < thread.updated_at);

            return (
              <Animated.View
                key={thread.id}
                entering={FadeInDown.delay(Math.min(i, 8) * 40).duration(220)}
              >
                <Card onPress={() => router.push(`/(app)/messages/${thread.id}`)}>
                  <View
                    style={{ flexDirection: "row", alignItems: "center", gap: space.md }}
                  >
                    <Avatar name={participantName(others[0]?.name ?? "?")} size={44} />
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: space.sm,
                        }}
                      >
                        <Text
                          numberOfLines={1}
                          style={{
                            flex: 1,
                            fontSize: 16,
                            fontWeight: unread ? "800" : "700",
                            color: palette.foreground,
                          }}
                        >
                          {title}
                        </Text>
                        <Text style={{ fontSize: 12, color: palette.faint }}>
                          {chatTimestamp(thread.updated_at)}
                        </Text>
                      </View>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: space.sm,
                          marginTop: 2,
                        }}
                      >
                        <Text
                          numberOfLines={1}
                          style={{
                            flex: 1,
                            fontSize: 13,
                            color: unread ? palette.foreground : palette.muted,
                          }}
                        >
                          {thread.lastMessage?.body ?? ""}
                        </Text>
                        {unread ? (
                          <View
                            style={{
                              width: 9,
                              height: 9,
                              borderRadius: radius.pill,
                              backgroundColor: palette.accent,
                            }}
                          />
                        ) : null}
                      </View>
                    </View>
                  </View>
                </Card>
              </Animated.View>
            );
          })
        )}
      </ScrollView>
    </>
  );
}
