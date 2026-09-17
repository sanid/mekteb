import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TextInput, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, ApiError } from "@/lib/api";
import { invalidate, useResource } from "@/lib/resource";
import { roleLabel, tm } from "@/lib/i18n";
import type { MessagingContact } from "@/lib/types";
import { Avatar, Card, Chip, EmptyState, ErrorNotice, FirstLoad } from "@/components/ui";
import { radius, space, usePalette } from "@/theme";

/**
 * Contact picker for starting a chat.
 *
 * `/messages/find-or-create` is what decides whether a thread already exists —
 * doing that here would need the whole participant table on the device, and
 * two people tapping each other at once would end up in two different threads.
 */
export default function NewChatScreen() {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [starting, setStarting] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);

  const { data: contacts, error } = useResource<MessagingContact[]>(
    "messages/contacts",
    useCallback(() => api<MessagingContact[]>("/messages/contacts"), []),
    { fallbackError: tm("contactsLoadFailed") },
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts ?? [];
    return (contacts ?? []).filter((c) => c.name.toLowerCase().includes(q));
  }, [contacts, search]);

  if (!contacts) {
    return (
      <>
        <Stack.Screen options={{ title: tm("newChat") }} />
        <FirstLoad error={error} />
      </>
    );
  }

  const start = async (contact: MessagingContact) => {
    if (starting) return;
    setStarting(contact.id);
    setStartError(null);
    try {
      const { threadId } = await api<{ threadId: string }>("/messages/find-or-create", {
        method: "POST",
        body: { recipient_id: contact.id },
      });
      invalidate("messages/threads");
      // `replace`, so backing out of the chat returns to the thread list
      // rather than to the picker the user is done with.
      router.replace(`/(app)/messages/${threadId}`);
    } catch (e) {
      setStartError(e instanceof ApiError ? e.message : tm("startChatFailed"));
    } finally {
      setStarting(null);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: tm("newChat") }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: palette.background }}
        contentContainerStyle={{
          padding: space.xl,
          gap: space.md,
          paddingBottom: insets.bottom + space.xxl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={tm("searchContacts")}
          placeholderTextColor={palette.faint}
          autoCorrect={false}
          style={{
            borderWidth: 1,
            borderColor: palette.cardBorder,
            backgroundColor: palette.card,
            color: palette.foreground,
            borderRadius: radius.md,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 16,
          }}
        />

        {error ? <ErrorNotice message={error} /> : null}
        {startError ? <ErrorNotice message={startError} /> : null}

        {filtered.length === 0 ? (
          <EmptyState icon="groups">{tm("noContacts")}</EmptyState>
        ) : (
          filtered.map((contact) => (
            <Card key={contact.id} onPress={() => void start(contact)}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
                <Avatar name={contact.name} size={40} />
                <Text
                  numberOfLines={1}
                  style={{
                    flex: 1,
                    fontSize: 16,
                    fontWeight: "700",
                    color: palette.foreground,
                  }}
                >
                  {contact.name}
                </Text>
                {starting === contact.id ? (
                  <ActivityIndicator color={palette.accent} />
                ) : (
                  <Chip label={roleLabel(contact.role)} />
                )}
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </>
  );
}
