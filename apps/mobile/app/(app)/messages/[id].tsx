import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { api, ApiError } from "@/lib/api";
import { invalidate, useResource } from "@/lib/resource";
import { useLiveMessages } from "@/lib/realtime";
import { formatDate, tm } from "@/lib/i18n";
import { useSession } from "@/lib/session-context";
import type { MessageThreadDetail } from "@/lib/types";
import { participantName } from "@/lib/messaging";
import { EmptyState, ErrorNotice, FirstLoad } from "@/components/ui";
import { radius, space, usePalette } from "@/theme";

/** Day heading above the first message of each date. */
function daySeparator(value: string): string {
  const day = new Date(value);
  const days = Math.round((Date.now() - day.getTime()) / 86_400_000);
  if (days < 1) return tm("today");
  if (days === 1) return tm("yesterday");
  return formatDate(day, { day: "numeric", month: "long", year: "numeric" });
}

/**
 * One conversation.
 *
 * Sending is optimistic: the bubble appears the moment the user taps send,
 * written straight into the cached thread, and the background refetch swaps it
 * for the server's row when it lands. The server `created_at` is what date
 * separators group on, so a locally-invented timestamp only ever shows for the
 * sub-second a bubble is pending — the final state always carries the server's
 * value.
 */
export default function ThreadScreen() {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const scroller = useRef<ScrollView>(null);

  const { data, error, refresh, set } = useResource<MessageThreadDetail>(
    id ? `messages/thread/${id}` : null,
    useCallback(() => api<MessageThreadDetail>(`/messages/threads/${id}`), [id]),
    { fallbackError: tm("threadLoadFailed") },
  );

  /**
   * A reply from the other side arrives on its own. The subscription only
   * signals; `refresh()` re-fetches through the API, so the messages rendered
   * are the same shape and the same RLS check as on first load. It also
   * reconciles an optimistic bubble of our own: the refetched thread contains
   * the server row, which replaces the local one wholesale.
   */
  useLiveMessages(id, () => {
    void refresh();
    // The list orders by `updated_at` and shows the last message.
    invalidate("messages/threads");
  }, !!id);

  // Opening a thread is what marks it read — same as the web chat window.
  const marked = useRef(false);
  useEffect(() => {
    if (!id || !data || marked.current) return;
    marked.current = true;
    void api(`/messages/threads/${id}/read`, { method: "PUT" })
      .then(() => invalidate("messages/threads"))
      .catch(() => {
        marked.current = false;
      });
  }, [id, data]);

  const messageCount = data?.messages.length ?? 0;
  useEffect(() => {
    if (messageCount) scroller.current?.scrollToEnd({ animated: false });
  }, [messageCount]);

  const others = (data?.thread.message_participants ?? []).filter(
    (p) => p.profile_id !== session?.userId,
  );
  const title =
    data?.thread.subject ||
    others
      .map((p) =>
        participantName(p.profiles?.display_name ?? p.profiles?.full_name ?? "?"),
      )
      .join(", ") ||
    tm("messages");

  if (!data) {
    return (
      <>
        <Stack.Screen options={{ title: tm("messages") }} />
        <FirstLoad error={error} />
      </>
    );
  }

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    const optimistic = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      author_profile_id: session?.userId ?? null,
      body,
      created_at: new Date().toISOString(),
    };
    // Optimistic: write the bubble into the cached thread now and clear the
    // box; the background refetch replaces it with the server row. A failed
    // send removes it again and restores what was typed.
    set({ ...data, messages: [...data.messages, optimistic] });
    setDraft("");
    setSending(true);
    setSendError(null);
    try {
      await api(`/messages/threads/${id}`, { method: "POST", body: { body } });
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // The thread list orders by `updated_at` and shows the last message.
      invalidate("messages/threads");
      // Background: no need to hold the send button on the refetch.
      void refresh();
    } catch (e) {
      set({
        ...data,
        messages: data.messages.filter((m) => m.id !== optimistic.id),
      });
      setDraft(body);
      setSendError(e instanceof ApiError ? e.message : tm("sendFailed"));
    } finally {
      setSending(false);
    }
  };

  const allMessages = data.messages;
  let lastDay = "";

  return (
    <>
      <Stack.Screen options={{ title }} />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: palette.background }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        // The stack header already occupies the top inset; without this offset
        // iOS pushes the composer up by that much again and leaves a gap.
        keyboardVerticalOffset={insets.top + 44}
      >
        <ScrollView
          ref={scroller}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: space.xl, gap: space.sm }}
          onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: false })}
        >
          {error ? <ErrorNotice message={error} /> : null}

          {allMessages.length === 0 ? (
            <EmptyState icon="messages">{tm("emptyThread")}</EmptyState>
          ) : (
            allMessages.map((m) => {
              const mine = m.author_profile_id === session?.userId;
              const day = daySeparator(m.created_at);
              const showDay = day !== lastDay;
              lastDay = day;

              return (
                <View key={m.id}>
                  {showDay ? (
                    <Text
                      style={{
                        alignSelf: "center",
                        fontSize: 12,
                        fontWeight: "700",
                        color: palette.faint,
                        marginVertical: space.md,
                      }}
                    >
                      {day}
                    </Text>
                  ) : null}
                  <View
                    style={{
                      alignSelf: mine ? "flex-end" : "flex-start",
                      maxWidth: "82%",
                      paddingHorizontal: space.md,
                      paddingVertical: space.sm + 2,
                      borderRadius: radius.lg,
                      backgroundColor: mine ? palette.accent : palette.card,
                      borderWidth: mine ? 0 : 1,
                      borderColor: palette.cardBorder,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 15,
                        lineHeight: 21,
                        color: mine ? palette.onAccent : palette.foreground,
                      }}
                    >
                      {m.body}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        marginTop: 4,
                        alignSelf: "flex-end",
                        color: mine ? palette.onAccent : palette.faint,
                        opacity: mine ? 0.75 : 1,
                      }}
                    >
                      {formatDate(m.created_at, { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        <View
          style={{
            paddingHorizontal: space.md,
            paddingTop: space.sm,
            paddingBottom: insets.bottom || space.sm,
            borderTopWidth: 1,
            borderTopColor: palette.cardBorder,
            backgroundColor: palette.surface,
            gap: space.sm,
          }}
        >
          {sendError ? <ErrorNotice message={sendError} /> : null}
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: space.sm }}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={tm("typeMessage")}
              placeholderTextColor={palette.faint}
              multiline
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: palette.cardBorder,
                backgroundColor: palette.card,
                color: palette.foreground,
                borderRadius: radius.lg,
                paddingHorizontal: 14,
                paddingTop: 10,
                paddingBottom: 10,
                fontSize: 16,
                maxHeight: 120,
              }}
            />
            {/* A round send button rather than a labelled one: "Senden" beside
                a full-width German placeholder leaves no room for the box. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tm("send")}
              accessibilityState={{ disabled: !draft.trim() || sending, busy: sending }}
              disabled={!draft.trim() || sending}
              onPress={send}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: palette.accent,
                opacity: !draft.trim() || sending ? 0.45 : pressed ? 0.7 : 1,
              })}
            >
              {sending ? (
                <ActivityIndicator color={palette.onAccent} />
              ) : (
                <Text style={{ color: palette.onAccent, fontSize: 18, fontWeight: "700" }}>
                  ↑
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}
