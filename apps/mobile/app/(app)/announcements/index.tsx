import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { api, ApiError } from "@/lib/api";
import { invalidate } from "@/lib/resource";
import { formatDate, tm } from "@/lib/i18n";
import type { OwnAnnouncement, TeacherGroup } from "@/lib/types";
import {
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorNotice,
  IconButton,
  Loading,
} from "@/components/ui";
import { space, usePalette } from "@/theme";

/**
 * The teacher's own announcements — edit and delete live here, reachable from
 * the inbox. Only rows the caller authored appear: the GET route scopes by
 * `author_profile_id`, mirroring the web teacher list.
 */
export default function MyAnnouncementsScreen() {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [items, setItems] = useState<OwnAnnouncement[] | null>(null);
  const [groups, setGroups] = useState<TeacherGroup[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [mine, g] = await Promise.all([
        api<OwnAnnouncement[]>("/teacher/announcements"),
        api<TeacherGroup[]>("/teacher/groups"),
      ]);
      setItems(mine);
      setGroups(g);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : tm("announcementsLoadFailed"));
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const groupName = useMemo(() => {
    const map = new Map(groups.map((g) => [g.id, g.name]));
    return (groupId: string | null) => (groupId ? map.get(groupId) ?? "" : "");
  }, [groups]);

  const askDelete = (a: OwnAnnouncement) => {
    Alert.alert(tm("deleteAnnouncement"), tm("deleteAnnouncementConfirm"), [
      { text: tm("cancel"), style: "cancel" },
      {
        text: tm("delete"),
        style: "destructive",
        onPress: async () => {
          if (busyId) return;
          setBusyId(a.id);
          setError(null);
          try {
            await api(`/teacher/announcements/${a.id}`, { method: "DELETE" });
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setItems(await api<OwnAnnouncement[]>("/teacher/announcements"));
            // Everyone's feed changes too.
            invalidate("announcements");
          } catch (e) {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setError(e instanceof ApiError ? e.message : tm("announcementCreateFailed"));
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  if (items === null) {
    return (
      <>
        <Stack.Screen options={{ title: tm("myAnnouncements") }} />
        <Loading />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: tm("myAnnouncements") }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: palette.background }}
        contentContainerStyle={{
          padding: space.xl,
          gap: space.lg,
          paddingBottom: insets.bottom + space.xxl,
        }}
      >
        {error ? <ErrorNotice message={error} /> : null}

        <Button
          label={tm("newAnnouncement")}
          icon="announcements"
          onPress={() => router.push("/(app)/announcements/new")}
          haptic="none"
        />

        {items.length === 0 ? (
          <EmptyState icon="announcements">{tm("noOwnAnnouncements")}</EmptyState>
        ) : (
          items.map((a) => {
            const audienceLabel =
              a.audience === "group"
                ? groupName(a.group_id) || tm("audienceGroup")
                : tm("audienceMosque");
            return (
              <Card key={a.id}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
                  <Text style={{ flex: 1, color: palette.foreground, fontWeight: "700", fontSize: 15 }}>
                    {a.title}
                  </Text>
                  {!a.is_published ? (
                    <Chip label={tm("unpublished")} fg={palette.muted} bg={palette.surface} />
                  ) : null}
                </View>

                {a.body ? (
                  <Text style={{ color: palette.muted, fontSize: 14, marginTop: 6 }} numberOfLines={4}>
                    {a.body}
                  </Text>
                ) : null}

                <View style={{ flexDirection: "row", alignItems: "center", marginTop: space.sm, gap: space.sm }}>
                  <View style={{ flex: 1, flexDirection: "row", gap: 6, alignItems: "center" }}>
                    <Chip label={audienceLabel} fg={palette.info} bg={palette.infoSubtle} />
                    <Text style={{ color: palette.faint, fontSize: 12 }}>
                      {formatDate(a.created_at, { day: "numeric", month: "long" })}
                    </Text>
                  </View>
                  <IconButton
                    icon="edit"
                    accessibilityLabel={tm("editAnnouncement")}
                    onPress={() => router.push(`/(app)/announcements/new?edit=${a.id}`)}
                  />
                  <IconButton
                    icon="delete"
                    accessibilityLabel={tm("deleteAnnouncement")}
                    onPress={() => askDelete(a)}
                  />
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </>
  );
}
