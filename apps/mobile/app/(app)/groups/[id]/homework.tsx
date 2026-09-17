import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { api, ApiError } from "@/lib/api";
import { invalidate } from "@/lib/resource";
import { formatDate, tm } from "@/lib/i18n";
import type { GroupDetail, GroupHomework } from "@/lib/types";
import {
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
 * Set homework for a group, and see what has already been set.
 *
 * Due dates are offered as presets rather than a calendar. Homework in a
 * mekteb is set for "next lesson" or "in two weeks", and a date picker is a
 * modal, a native dependency and several taps for a decision that is almost
 * always one of these four. An arbitrary-date path can follow if teachers
 * ask for it.
 *
 * Editing reuses the compose card: tapping a homework row loads it back in
 * (the API's PUT updates title/body/due only — audience and targets are
 * immutable once assigned, so the audience picker locks while editing).
 */
type DuePreset = "none" | "week" | "twoWeeks" | "month";

const DUE_DAYS: Record<Exclude<DuePreset, "none">, number> = {
  week: 7,
  twoWeeks: 14,
  month: 30,
};

/** Local YYYY-MM-DD — `toISOString()` shifts the date across UTC midnight. */
function dateInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Reverse map: which preset a due date falls on, or "none" for anything else. */
function presetForDate(dueDate: string | null): DuePreset {
  if (!dueDate) return "none";
  for (const p of ["week", "twoWeeks", "month"] as const) {
    if (dateInDays(DUE_DAYS[p]) === dueDate) return p;
  }
  return "none";
}

export default function GroupHomeworkScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const palette = usePalette();
  const insets = useSafeAreaInsets();

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [items, setItems] = useState<GroupHomework[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [due, setDue] = useState<DuePreset>("week");
  const [audience, setAudience] = useState<"group" | "individual">("group");
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  /** The row being edited, or null when the card is in "new" mode. */
  const [editing, setEditing] = useState<GroupHomework | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const [g, hw] = await Promise.all([
        api<GroupDetail>(`/teacher/groups/${id}`),
        api<GroupHomework[]>(`/groups/${id}/homework`),
      ]);
      setGroup(g);
      setItems(hw);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : tm("groupLoadFailed"));
    }
  }, [id]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const nameFor = useMemo(() => {
    const map = new Map((group?.enrollments ?? []).map((e) => [e.studentProfileId, e.studentName]));
    return (studentProfileId: string) => map.get(studentProfileId) ?? "";
  }, [group]);

  const toggleStudent = (studentProfileId: string) => {
    void Haptics.selectionAsync();
    setSelected((s) =>
      s.includes(studentProfileId)
        ? s.filter((x) => x !== studentProfileId)
        : [...s, studentProfileId],
    );
  };

  const canSubmit =
    title.trim().length > 0 && (audience === "group" || selected.length > 0) && !saving;

  const cancelEdit = () => {
    setEditing(null);
    setTitle("");
    setBody("");
    setDue("week");
    setAudience("group");
    setSelected([]);
  };

  /** Load a row back into the compose card. */
  const startEdit = (h: GroupHomework) => {
    void Haptics.selectionAsync();
    setEditing(h);
    setTitle(h.title);
    setBody(h.body ?? "");
    setDue(presetForDate(h.due_date));
    setAudience(h.audience === "individual" ? "individual" : "group");
    setSelected(h.homework_targets.map((t) => t.student_profile_id));
    setError(null);
  };

  const askDelete = (h: GroupHomework) => {
    Alert.alert(tm("deleteHomework"), tm("deleteHomeworkConfirm"), [
      { text: tm("cancel"), style: "cancel" },
      {
        text: tm("delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await api(`/homework/${h.id}`, { method: "DELETE" });
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setError(null);
            if (editing?.id === h.id) cancelEdit();
            setItems(await api<GroupHomework[]>(`/groups/${id}/homework`));
            // Students see this immediately on their own homework screen and home.
            invalidate("student/homework");
            invalidate("home");
          } catch (e) {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setError(e instanceof ApiError ? e.message : tm("homeworkSaveFailed"));
          }
        },
      },
    ]);
  };

  const submit = async () => {
    if (!id || !canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: title.trim(),
        body: body.trim() || null,
        due_date: due === "none" ? null : dateInDays(DUE_DAYS[due]),
      };
      if (editing) {
        await api(`/homework/${editing.id}`, {
          method: "PUT",
          body: { ...payload, group_id: id },
        });
      } else {
        await api(`/groups/${id}/homework`, {
          method: "POST",
          body: { ...payload, audience, student_ids: audience === "individual" ? selected : [] },
        });
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      cancelEdit();
      setItems(await api<GroupHomework[]>(`/groups/${id}/homework`));
      // Students see this immediately on their own homework screen and home.
      invalidate("student/homework");
      invalidate("home");
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e instanceof ApiError ? e.message : tm("homeworkSaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (!group || items === null) {
    return (
      <>
        <Stack.Screen options={{ title: tm("homework") }} />
        <Loading />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: tm("homework") }} />
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
              <SectionTitle>{editing ? tm("editHomeworkTitle") : tm("newHomework")}</SectionTitle>

              <Field
                label={tm("homeworkTitle")}
                value={title}
                onChangeText={setTitle}
                placeholder={tm("homeworkTitlePlaceholder")}
              />
              <Field
                label={tm("homeworkBody")}
                value={body}
                onChangeText={setBody}
                multiline
              />

              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 13, color: palette.muted, fontWeight: "600" }}>
                  {tm("dueDate")}
                </Text>
                <SegmentedRow<DuePreset>
                  value={due}
                  onChange={setDue}
                  options={[
                    { value: "none", label: tm("dueNone") },
                    { value: "week", label: tm("dueWeek") },
                    { value: "twoWeeks", label: tm("dueTwoWeeks") },
                    { value: "month", label: tm("dueMonth") },
                  ]}
                />
                {due !== "none" ? (
                  <Text style={{ fontSize: 12, color: palette.faint }}>
                    {formatDate(dateInDays(DUE_DAYS[due]), {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </Text>
                ) : null}
              </View>

              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 13, color: palette.muted, fontWeight: "600" }}>
                  {tm("audience")}
                </Text>
                {/*
                  While editing the audience locks: PUT updates title/body/due
                  only, and reassigning who a homework goes to is a different
                  act than fixing a typo — delete and re-post instead.
                */}
                {editing ? (
                  <View
                    style={{
                      paddingHorizontal: space.md,
                      paddingVertical: space.sm,
                      borderRadius: radius.md,
                      borderWidth: 1,
                      borderColor: palette.cardBorder,
                      backgroundColor: palette.card,
                    }}
                  >
                    <Text style={{ color: palette.muted, fontSize: 13 }}>
                      {editing.audience === "individual"
                        ? `${tm("audienceSelected")}: ${editing.homework_targets
                            .map((t) => nameFor(t.student_profile_id))
                            .filter(Boolean)
                            .join(", ")}`
                        : tm("audienceWholeGroup")}
                    </Text>
                  </View>
                ) : (
                  <SegmentedRow<"group" | "individual">
                    value={audience}
                    onChange={setAudience}
                    options={[
                      { value: "group", label: tm("audienceWholeGroup") },
                      { value: "individual", label: tm("audienceSelected") },
                    ]}
                  />
                )}
              </View>

              {!editing && audience === "individual" ? (
                <View style={{ gap: space.sm }}>
                  {group.enrollments.length === 0 ? (
                    <EmptyState icon="groups">{tm("noStudents")}</EmptyState>
                  ) : (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                      {group.enrollments.map((e) => {
                        const on = selected.includes(e.studentProfileId);
                        return (
                          <Pressable
                            key={e.id}
                            accessibilityRole="button"
                            accessibilityState={{ selected: on }}
                            onPress={() => toggleStudent(e.studentProfileId)}
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
                              {e.studentName}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                  {/*
                    The API rejects an individual assignment with no targets,
                    and so does the button — a homework row with no targets is
                    invisible to every parent, which is the failure mode noted
                    in MEMORY.md's known gaps.
                  */}
                </View>
              ) : null}

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
                  label={tm("setHomework")}
                  onPress={submit}
                  busy={saving}
                  disabled={!canSubmit}
                  haptic="none"
                />
              )}
            </View>
          </Card>

          <View style={{ gap: space.md }}>
            <SectionTitle>{tm("existingHomework")}</SectionTitle>
            {items.length === 0 ? (
              <EmptyState icon="homework">{tm("noHomeworkYet")}</EmptyState>
            ) : (
              items.map((h, i) => (
                <Animated.View
                  key={h.id}
                  entering={FadeInDown.delay(Math.min(i, 8) * 30).duration(200)}
                >
                  <Card>
                    <View style={{ flexDirection: "row", gap: space.sm }}>
                      <Text
                        style={{
                          flex: 1,
                          color: palette.foreground,
                          fontWeight: "700",
                          fontSize: 15,
                        }}
                      >
                        {h.title}
                      </Text>
                      {h.audience === "individual" ? (
                        <Chip label={tm("audienceSelected")} />
                      ) : null}
                    </View>

                    {h.due_date ? (
                      <Text style={{ color: palette.muted, fontSize: 13, marginTop: 4 }}>
                        {tm("due")}:{" "}
                        {formatDate(h.due_date, { day: "numeric", month: "long" })}
                      </Text>
                    ) : null}

                    {h.audience === "individual" && h.homework_targets.length > 0 ? (
                      <Text style={{ color: palette.faint, fontSize: 12, marginTop: 4 }}>
                        {h.homework_targets
                          .map((t) => nameFor(t.student_profile_id))
                          .filter(Boolean)
                          .join(", ")}
                      </Text>
                    ) : null}

                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginTop: space.sm,
                        gap: space.sm,
                      }}
                    >
                      <Text style={{ color: palette.faint, fontSize: 12, flex: 1 }}>
                        {formatDate(h.created_at, { day: "numeric", month: "long" })}
                      </Text>
                      <IconButton
                        icon="edit"
                        accessibilityLabel={tm("editHomeworkTitle")}
                        onPress={() => startEdit(h)}
                      />
                      <IconButton
                        icon="delete"
                        accessibilityLabel={tm("deleteHomework")}
                        onPress={() => askDelete(h)}
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
