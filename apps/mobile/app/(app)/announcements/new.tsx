import { useCallback, useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { api, ApiError } from "@/lib/api";
import { invalidate } from "@/lib/resource";
import { tm } from "@/lib/i18n";
import type { OwnAnnouncement, TeacherGroup } from "@/lib/types";
import {
  Button,
  Card,
  EmptyState,
  ErrorNotice,
  Field,
  Loading,
  SegmentedRow,
} from "@/components/ui";
import { radius, space, usePalette } from "@/theme";

/**
 * Compose an announcement — or edit one of your own (`?edit=<id>`).
 *
 * Announcements are published immediately (the web teacher flow has no draft
 * UI either: create posts, and the POST route sets `is_published` itself).
 * Editing only ever touches the caller's own rows, matching the web rule.
 */
type Audience = "mosque" | "group";

export default function NewAnnouncementScreen() {
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const router = useRouter();
  const palette = usePalette();
  const insets = useSafeAreaInsets();

  const [groups, setGroups] = useState<TeacherGroup[] | null>(null);
  const [loading, setLoading] = useState(edit ? true : false);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<Audience>("mosque");
  const [groupId, setGroupId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const g = await api<TeacherGroup[]>("/teacher/groups");
      setGroups(g);
      if (edit) {
        const mine = await api<OwnAnnouncement[]>("/teacher/announcements");
        const target = mine.find((a) => a.id === edit);
        if (!target) {
          router.replace("/(app)/announcements");
          return;
        }
        setTitle(target.title);
        setBody(target.body ?? "");
        setAudience(target.audience === "group" ? "group" : "mosque");
        setGroupId(target.group_id);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : tm("announcementCreateFailed"));
    } finally {
      setLoading(false);
    }
  }, [edit, router]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const canSubmit = title.trim().length > 0 && body.trim().length > 0 &&
    (audience === "mosque" || Boolean(groupId)) && !saving;

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: title.trim(),
        body: body.trim(),
        audience,
        group_id: audience === "group" ? groupId : undefined,
      };
      if (edit) {
        await api(`/teacher/announcements/${edit}`, { method: "PUT", body: payload });
      } else {
        await api("/teacher/announcements", { method: "POST", body: payload });
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // The inbox feed everyone reads is cached under "announcements".
      invalidate("announcements");
      router.back();
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e instanceof ApiError ? e.message : tm("announcementCreateFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: tm("newAnnouncement") }} />
        <Loading />
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{ title: edit ? tm("editAnnouncement") : tm("newAnnouncement") }}
      />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: palette.background }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          contentContainerStyle={{
            padding: space.xl,
            gap: space.lg,
            paddingBottom: insets.bottom + space.xxl,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {error ? <ErrorNotice message={error} /> : null}

          <Card style={{ gap: space.md }}>
            <Field
              label={tm("announcementTitle")}
              value={title}
              onChangeText={setTitle}
              placeholder={tm("announcementTitle")}
            />
            <Field
              label={tm("announcementBody")}
              value={body}
              onChangeText={setBody}
              multiline
            />

            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 13, color: palette.muted, fontWeight: "600" }}>
                {tm("announcementAudience")}
              </Text>
              <SegmentedRow<Audience>
                value={audience}
                onChange={setAudience}
                options={[
                  { value: "mosque", label: tm("audienceMosque") },
                  { value: "group", label: tm("audienceGroup") },
                ]}
              />
            </View>

            {audience === "group" ? (
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 13, color: palette.muted, fontWeight: "600" }}>
                  {tm("selectGroup")}
                </Text>
                {!groups || groups.length === 0 ? (
                  <EmptyState icon="groups">{tm("noGroups")}</EmptyState>
                ) : (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    {groups.map((g) => {
                      const on = groupId === g.id;
                      return (
                        <Pressable
                          key={g.id}
                          accessibilityRole="button"
                          accessibilityState={{ selected: on }}
                          onPress={() => {
                            void Haptics.selectionAsync();
                            setGroupId(g.id);
                          }}
                          style={({ pressed }) => ({
                            paddingHorizontal: space.md,
                            paddingVertical: space.sm,
                            borderRadius: radius.pill,
                            borderWidth: 1.5,
                            borderColor: on ? palette.accent : palette.cardBorder,
                            backgroundColor: on ? palette.accentSubtle : "transparent",
                            opacity: pressed ? 0.65 : 1,
                          })}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: on ? "800" : "600",
                              color: on ? palette.accent : palette.muted,
                            }}
                          >
                            {g.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            ) : null}

            <Button
              label={tm("postAnnouncement")}
              onPress={submit}
              busy={saving}
              disabled={!canSubmit}
              haptic="none"
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
