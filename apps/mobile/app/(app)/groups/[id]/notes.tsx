import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { api, ApiError } from "@/lib/api";
import { formatDate, tm } from "@/lib/i18n";
import type { GroupDetail, ProgressNote } from "@/lib/types";
import {
  Avatar,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorNotice,
  Field,
  IconButton,
  Loading,
  SectionTitle,
  SegmentedRow,
} from "@/components/ui";
import { radius, space, usePalette } from "@/theme";

/**
 * Progress notes for one group.
 *
 * `GET /teacher/notes` returns every note this teacher wrote across all their
 * groups — there is no per-group endpoint — so the list is filtered client
 * side. It also returns only `student_profile_id`, so names come from the
 * group roster fetched alongside it.
 *
 * Notes are full CRUD here: the compose card on top doubles as the editor
 * (tapping a note loads it back in — the API's PUT updates body and
 * visibility only, so the student chips lock while editing), and delete goes
 * through a confirm alert because a note a parent has already read cannot be
 * un-read.
 */
type Visibility = "private" | "parents";

export default function GroupNotesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const palette = usePalette();
  const insets = useSafeAreaInsets();

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [notes, setNotes] = useState<ProgressNote[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [student, setStudent] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("private");
  const [saving, setSaving] = useState(false);
  /** The note being edited, or null when the card is in "new note" mode. */
  const [editing, setEditing] = useState<ProgressNote | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const [g, all] = await Promise.all([
        api<GroupDetail>(`/teacher/groups/${id}`),
        api<ProgressNote[]>("/teacher/notes"),
      ]);
      setGroup(g);
      setNotes(all.filter((n) => n.group_id === id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : tm("notesLoadFailed"));
    }
  }, [id]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const nameFor = useMemo(() => {
    const map = new Map((group?.enrollments ?? []).map((e) => [e.studentProfileId, e.studentName]));
    return (studentProfileId: string) => map.get(studentProfileId) ?? "";
  }, [group]);

  const reloadNotes = async () => {
    const all = await api<ProgressNote[]>("/teacher/notes");
    setNotes(all.filter((n) => n.group_id === id));
  };

  /** Load a note back into the editor. */
  const startEdit = (n: ProgressNote) => {
    void Haptics.selectionAsync();
    setEditing(n);
    setStudent(n.student_profile_id);
    setBody(n.body);
    setVisibility(n.visible_to_parents ? "parents" : "private");
    setError(null);
  };

  const cancelEdit = () => {
    setEditing(null);
    setStudent(null);
    setBody("");
    setVisibility("private");
  };

  const askDelete = (n: ProgressNote) => {
    Alert.alert(tm("deleteNote"), tm("deleteNoteConfirm"), [
      { text: tm("cancel"), style: "cancel" },
      {
        text: tm("delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await api(`/teacher/notes/${n.id}`, { method: "DELETE" });
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setError(null);
            if (editing?.id === n.id) cancelEdit();
            await reloadNotes();
          } catch (e) {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setError(e instanceof ApiError ? e.message : tm("noteSaveFailed"));
          }
        },
      },
    ]);
  };

  const canSubmit = Boolean(student) && body.trim().length > 0 && !saving;

  const submit = async () => {
    if (!id || !student || !canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await api(`/teacher/notes/${editing.id}`, {
          method: "PUT",
          body: {
            body: body.trim(),
            visible_to_parents: visibility === "parents",
          },
        });
      } else {
        await api("/teacher/notes", {
          method: "POST",
          body: {
            group_id: id,
            student_profile_id: student,
            body: body.trim(),
            visible_to_parents: visibility === "parents",
          },
        });
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      cancelEdit();
      await reloadNotes();
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e instanceof ApiError ? e.message : tm("noteSaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (!group || notes === null) {
    return (
      <>
        <Stack.Screen options={{ title: tm("notes") }} />
        <Loading />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: tm("notes") }} />
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

          <Card>
            <View style={{ gap: space.md }}>
              <SectionTitle>
                {editing ? tm("editNoteTitle") : tm("newNote")}
              </SectionTitle>

              {group.enrollments.length === 0 ? (
                <EmptyState icon="groups">{tm("noStudents")}</EmptyState>
              ) : (
                <View style={{ gap: 6 }}>
                  <Text style={{ fontSize: 13, color: palette.muted, fontWeight: "600" }}>
                    {tm("student")}
                  </Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    {group.enrollments.map((e) => {
                      const on = student === e.studentProfileId;
                      const locked = editing !== null;
                      return (
                        <Pressable
                          key={e.id}
                          accessibilityRole="button"
                          accessibilityState={{ selected: on, disabled: locked }}
                          disabled={locked}
                          onPress={() => {
                            void Haptics.selectionAsync();
                            setStudent(e.studentProfileId);
                          }}
                          style={({ pressed }) => ({
                            paddingHorizontal: space.md,
                            paddingVertical: space.sm,
                            borderRadius: radius.pill,
                            borderWidth: 1.5,
                            borderColor: on ? palette.accent : palette.cardBorder,
                            backgroundColor: on ? palette.accentSubtle : "transparent",
                            opacity: pressed || locked ? 0.65 : 1,
                          })}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: on ? "800" : "600",
                              color: on ? palette.accent : palette.muted,
                            }}
                          >
                            {e.studentName}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}

              <Field label={tm("note")} value={body} onChangeText={setBody} multiline />

              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 13, color: palette.muted, fontWeight: "600" }}>
                  {tm("noteVisibility")}
                </Text>
                {/*
                  Defaults to private. A note the parent can read is a
                  different act from a note to yourself, and the safe default
                  is the one that cannot surprise anyone.
                */}
                <SegmentedRow<Visibility>
                  value={visibility}
                  onChange={setVisibility}
                  options={[
                    { value: "private", label: tm("notePrivate") },
                    { value: "parents", label: tm("noteVisibleToParents") },
                  ]}
                />
              </View>

              {editing ? (
                <View style={{ flexDirection: "row", gap: space.md }}>
                  <Button
                    label={tm("cancel")}
                    variant="ghost"
                    onPress={cancelEdit}
                    haptic="none"
                    style={{ flex: 1 }}
                  />
                  <Button
                    label={tm("saveChanges")}
                    onPress={submit}
                    busy={saving}
                    disabled={!canSubmit}
                    haptic="none"
                    style={{ flex: 1 }}
                  />
                </View>
              ) : (
                <Button
                  label={tm("saveNote")}
                  onPress={submit}
                  busy={saving}
                  disabled={!canSubmit}
                  haptic="none"
                />
              )}
            </View>
          </Card>

          <View style={{ gap: space.md }}>
            <SectionTitle>{tm("existingNotes")}</SectionTitle>
            {notes.length === 0 ? (
              <EmptyState icon="notes">{tm("noNotesYet")}</EmptyState>
            ) : (
              notes.map((n, i) => (
                <Animated.View
                  key={n.id}
                  entering={FadeInDown.delay(Math.min(i, 8) * 30).duration(200)}
                >
                  <Card>
                    <View
                      style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}
                    >
                      <Avatar name={nameFor(n.student_profile_id) || "?"} size={32} />
                      <Text
                        style={{ flex: 1, color: palette.foreground, fontWeight: "700" }}
                      >
                        {nameFor(n.student_profile_id)}
                      </Text>
                      {n.visible_to_parents ? (
                        <Chip
                          label={tm("noteVisibleToParents")}
                          fg={palette.info}
                          bg={palette.infoSubtle}
                        />
                      ) : null}
                    </View>

                    <Text
                      style={{
                        color: palette.muted,
                        fontSize: 14,
                        lineHeight: 21,
                        marginTop: space.sm,
                      }}
                    >
                      {n.body}
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginTop: space.sm,
                        gap: space.sm,
                      }}
                    >
                      <Text style={{ color: palette.faint, fontSize: 12, flex: 1 }}>
                        {formatDate(n.created_at, { day: "numeric", month: "long" })}
                        {n.updated_at !== n.created_at
                          ? ` · ${tm("updated", { date: formatDate(n.updated_at, { day: "numeric", month: "long" }) })}`
                          : ""}
                      </Text>
                      <IconButton
                        icon="edit"
                        accessibilityLabel={tm("editNoteTitle")}
                        onPress={() => startEdit(n)}
                      />
                      <IconButton
                        icon="delete"
                        accessibilityLabel={tm("deleteNote")}
                        onPress={() => askDelete(n)}
                      />
                    </View>
                  </Card>
                </Animated.View>
              ))
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
