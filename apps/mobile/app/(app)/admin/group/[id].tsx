import { useCallback, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { api } from "@/lib/api";
import { invalidate, useResource } from "@/lib/resource";
import { tm } from "@/lib/i18n";
import type { AdminGroupDetail, GroupCandidates } from "@/lib/types";
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  ErrorNotice,
  Field,
  FirstLoad,
  SectionTitle,
} from "@/components/ui";
import { space, usePalette } from "@/theme";
import { Icon } from "@/components/icon";

type PickerKind = "students" | "teachers" | null;

/**
 * The admin's group editor on the phone: roster with unenrol, teachers with
 * unassign, and add-student / assign-teacher pickers fed by the candidates
 * endpoint. Also doubles as the "new group" form when opened with `id=new` —
 * the created group's detail replaces the form so the admin can fill it
 * straight away.
 */
export default function AdminGroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "new";
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // ── New-group form state ─────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  // ── Detail state ─────────────────────────────────────────────────────────
  const [picker, setPicker] = useState<PickerKind>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const detail = useResource<AdminGroupDetail>(
    isNew ? null : `admin/group/${id}`,
    useCallback(() => api<AdminGroupDetail>(`/admin/groups/${id}`), [id]),
    { fallbackError: tm("loadFailed") },
  );
  const candidates = useResource<GroupCandidates>(
    picker && !isNew ? `admin/group/${id}/candidates` : null,
    useCallback(() => api<GroupCandidates>(`/admin/groups/${id}/candidates`), [id]),
    { fallbackError: tm("loadFailed") },
  );

  const refreshAll = () => {
    void detail.refresh();
    void candidates.refresh();
  };

  const createGroup = async () => {
    if (!name.trim() || creating) return;
    setCreating(true);
    setActionError(null);
    void Haptics.selectionAsync();
    try {
      const created = await api<{ id: string }>("/admin/groups", {
        method: "POST",
        body: { name: name.trim(), description: description.trim() || null },
      });
      invalidate("admin/groups");
      invalidate("admin/audit");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(`/(app)/admin/group/${created.id}`);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : tm("saveFailed"));
      setCreating(false);
    }
  };

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setActionError(null);
    try {
      await fn();
      invalidate("admin/groups");
      invalidate("admin/audit");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refreshAll();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : tm("saveFailed"));
    } finally {
      setBusy(null);
    }
  };

  const toggle = (candidateId: string) => {
    void Haptics.selectionAsync();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(candidateId)) next.delete(candidateId);
      else next.add(candidateId);
      return next;
    });
  };

  const openPicker = (kind: Exclude<PickerKind, null>) => {
    setSelected(new Set());
    setPicker(kind);
    setActionError(null);
  };

  const commitPicker = async () => {
    if (!picker || selected.size === 0) return;
    const ids = [...selected];
    await run(`add-${picker}`, async () => {
      await api(`/admin/groups/${id}/${picker === "students" ? "enroll" : "teachers"}`, {
        method: "POST",
        body:
          picker === "students"
            ? { student_profile_ids: ids }
            : { teacher_profile_ids: ids },
      });
    });
    setPicker(null);
  };

  const unenroll = (enrollmentId: string, studentName: string) => {
    Alert.alert(tm("unenrollConfirm"), studentName, [
      { text: tm("cancel"), style: "cancel" },
      {
        text: tm("remove"),
        style: "destructive",
        onPress: () =>
          void run(`unenroll-${enrollmentId}`, async () => {
            await api(`/admin/groups/${id}/enroll/${enrollmentId}`, { method: "DELETE" });
          }),
      },
    ]);
  };

  const unassign = (linkId: string, teacherName: string) => {
    Alert.alert(tm("unassignConfirm"), teacherName, [
      { text: tm("cancel"), style: "cancel" },
      {
        text: tm("remove"),
        style: "destructive",
        onPress: () =>
          void run(`unassign-${linkId}`, async () => {
            await api(`/admin/groups/${id}/teachers/${linkId}`, { method: "DELETE" });
          }),
      },
    ]);
  };

  // ── New-group form ───────────────────────────────────────────────────────
  if (isNew) {
    return (
      <>
        <Stack.Screen options={{ title: tm("newGroup") }} />
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: palette.background }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={{
              padding: space.xl,
              gap: space.md,
              paddingBottom: insets.bottom + space.xxl,
            }}
            keyboardShouldPersistTaps="handled"
          >
            <Card style={{ gap: space.md }}>
              <Field
                label={tm("groupName")}
                value={name}
                onChangeText={setName}
                placeholder={tm("groupNamePlaceholder")}
              />
              <Field
                label={tm("groupDescription")}
                value={description}
                onChangeText={setDescription}
                multiline
              />
            </Card>
            {actionError ? <ErrorNotice message={actionError} /> : null}
            <Button label={tm("newGroup")} busy={creating} disabled={!name.trim()} onPress={createGroup} />
          </ScrollView>
        </KeyboardAvoidingView>
      </>
    );
  }

  if (detail.data === null) {
    return (
      <>
        <Stack.Screen options={{ title: tm("group") }} />
        <FirstLoad error={detail.error} />
      </>
    );
  }

  const group = detail.data;
  const candidateStudents = candidates.data?.students ?? [];
  const candidateTeachers = candidates.data?.teachers ?? [];

  const renderPicker = (kind: "students" | "teachers") => {
    const list = kind === "students" ? candidateStudents : candidateTeachers;
    const label = (item: { id: string; full_name?: string; name?: string }) =>
      kind === "students"
        ? (item as { full_name: string }).full_name
        : (item as { name: string }).name;
    return (
      <View style={{ gap: space.sm }}>
        <SectionTitle>{kind === "students" ? tm("addStudents") : tm("addTeachers")}</SectionTitle>
        {list.length === 0 ? (
          <EmptyState icon="groups">{tm("noCandidates")}</EmptyState>
        ) : (
          list.map((item) => {
            const isOn = selected.has(item.id);
            return (
              <Card key={item.id} onPress={() => toggle(item.id)} style={{ padding: space.md }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
                  <Avatar name={label(item)} size={34} />
                  <Text style={{ flex: 1, color: palette.foreground, fontWeight: "600", fontSize: 14 }}>
                    {label(item)}
                  </Text>
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      borderWidth: 2,
                      borderColor: isOn ? palette.accent : palette.cardBorder,
                      backgroundColor: isOn ? palette.accent : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {isOn ? <Icon name="done" size={14} color={palette.onAccent} /> : null}
                  </View>
                </View>
              </Card>
            );
          })
        )}
        {list.length > 0 ? (
          <View style={{ flexDirection: "row", gap: space.sm }}>
            <View style={{ flex: 1 }}>
              <Button
                label={kind === "students" ? tm("addStudents") : tm("addTeachers")}
                busy={busy === `add-${kind}`}
                disabled={selected.size === 0}
                onPress={() => void commitPicker()}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button label={tm("cancel")} variant="ghost" onPress={() => setPicker(null)} />
            </View>
          </View>
        ) : (
          <Button label={tm("close")} variant="ghost" onPress={() => setPicker(null)} />
        )}
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: group.name }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: palette.background }}
        contentContainerStyle={{
          padding: space.xl,
          gap: space.lg,
          paddingBottom: insets.bottom + space.xxl,
        }}
        refreshControl={
          <RefreshControl refreshing={detail.refreshing} onRefresh={refreshAll} tintColor={palette.muted} />
        }
      >
        {group.description ? (
          <Text style={{ color: palette.muted, fontSize: 13 }}>{group.description}</Text>
        ) : null}
        {detail.error ? <ErrorNotice message={detail.error} /> : null}
        {actionError ? <ErrorNotice message={actionError} /> : null}

        {picker ? (
          renderPicker(picker)
        ) : (
          <>
            <View style={{ gap: space.md }}>
              <SectionTitle right={<Pressable onPress={() => openPicker("students")} hitSlop={8}>
                <Text style={{ color: palette.accent, fontWeight: "700", fontSize: 13 }}>
                  + {tm("addStudents")}
                </Text>
              </Pressable>}>
                {tm("enrolledStudents")}
              </SectionTitle>
              {group.enrollments.length === 0 ? (
                <EmptyState icon="students">{tm("noStudents")}</EmptyState>
              ) : (
                group.enrollments.map((e) => (
                  <Card key={e.id} style={{ padding: space.md }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
                      <Avatar name={e.studentName} size={34} />
                      <Text style={{ flex: 1, color: palette.foreground, fontWeight: "600", fontSize: 14 }}>
                        {e.studentName}
                      </Text>
                      <Pressable
                        disabled={busy === `unenroll-${e.id}`}
                        onPress={() => unenroll(e.id, e.studentName)}
                        hitSlop={8}
                      >
                        <Icon name="remove" size={18} color={busy === `unenroll-${e.id}` ? palette.faint : palette.danger} />
                      </Pressable>
                    </View>
                  </Card>
                ))
              )}
            </View>

            <View style={{ gap: space.md }}>
              <SectionTitle right={<Pressable onPress={() => openPicker("teachers")} hitSlop={8}>
                <Text style={{ color: palette.accent, fontWeight: "700", fontSize: 13 }}>
                  + {tm("addTeachers")}
                </Text>
              </Pressable>}>
                {tm("assignedTeachers")}
              </SectionTitle>
              {group.teacherLinks.length === 0 ? (
                <EmptyState icon="teacher">{tm("noTeachers")}</EmptyState>
              ) : (
                group.teacherLinks.map((t) => (
                  <Card key={t.id} style={{ padding: space.md }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
                      <Avatar name={t.teacherName} size={34} />
                      <Text style={{ flex: 1, color: palette.foreground, fontWeight: "600", fontSize: 14 }}>
                        {t.teacherName}
                      </Text>
                      <Pressable
                        disabled={busy === `unassign-${t.id}`}
                        onPress={() => unassign(t.id, t.teacherName)}
                        hitSlop={8}
                      >
                        <Icon name="remove" size={18} color={busy === `unassign-${t.id}` ? palette.faint : palette.danger} />
                      </Pressable>
                    </View>
                  </Card>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </>
  );
}
