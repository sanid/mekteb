import { useCallback, useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { api, ApiError } from "@/lib/api";
import { invalidate } from "@/lib/resource";
import { formatDate, tm } from "@/lib/i18n";
import type { CreatedAccount, GroupDetail } from "@/lib/types";
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  ErrorNotice,
  Field,
  Loading,
  SectionTitle,
  SegmentedRow,
} from "@/components/ui";
import { radius, space, usePalette } from "@/theme";

/**
 * Enrol a new student, or add a parent for one already in the group.
 *
 * Both endpoints create the auth user server-side and return a **temporary
 * password once** — there is no way to read it again, only to reset it from
 * the web admin. The whole screen is built around not losing it: the result
 * stays on screen until dismissed, the password is selectable for copy, and
 * the form only clears once the account exists.
 */
type Mode = "student" | "parent";

export default function GroupPeopleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const palette = usePalette();
  const insets = useSafeAreaInsets();

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<Mode>("student");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [relation, setRelation] = useState("");
  const [child, setChild] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<(CreatedAccount & { mode: Mode }) | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      setGroup(await api<GroupDetail>(`/teacher/groups/${id}`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : tm("groupLoadFailed"));
    }
  }, [id]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const canSubmit =
    fullName.trim().length > 0 &&
    email.trim().length > 0 &&
    (mode === "student" || Boolean(child)) &&
    !saving;

  const submit = async () => {
    if (!id || !canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      const result = await api<CreatedAccount>(
        mode === "student"
          ? `/teacher/groups/${id}/students`
          : `/teacher/groups/${id}/parents`,
        {
          method: "POST",
          body:
            mode === "student"
              ? { full_name: fullName.trim(), email: email.trim() }
              : {
                  full_name: fullName.trim(),
                  email: email.trim(),
                  relation: relation.trim() || null,
                  student_profile_id: child,
                },
        },
      );
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCreated({ ...result, mode });
      setFullName("");
      setEmail("");
      setRelation("");
      setChild(null);
      // A new student changes the roster the parent form picks from — and the
      // group screen and home student counts alongside it.
      setGroup(await api<GroupDetail>(`/teacher/groups/${id}`));
      invalidate(`groups/${id}`);
      invalidate("home");
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e instanceof ApiError ? e.message : tm("accountCreateFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (!group) {
    return (
      <>
        <Stack.Screen options={{ title: tm("addPeople") }} />
        <Loading />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: tm("addPeople") }} />
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

          {/*
            Shown once and never again — the server does not store the plain
            password. Dismissing is deliberate: nothing auto-clears it.
          */}
          {created ? (
            <Card style={{ borderColor: palette.accent, borderWidth: 1.5 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: palette.foreground }}>
                {created.mode === "student" ? tm("studentCreated") : tm("parentCreated")}
              </Text>
              <Text style={{ color: palette.muted, fontSize: 13, marginTop: 4 }}>
                {created.full_name} · {created.email}
              </Text>

              <View
                style={{
                  marginTop: space.md,
                  padding: space.md,
                  borderRadius: radius.md,
                  backgroundColor: palette.accentSubtle,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "700", color: palette.accent }}>
                  {tm("tempPassword").toUpperCase()}
                </Text>
                <Text
                  selectable
                  style={{
                    fontSize: 24,
                    fontWeight: "700",
                    color: palette.foreground,
                    letterSpacing: 1,
                    marginTop: 4,
                  }}
                >
                  {created.tempPassword}
                </Text>
              </View>

              <Text style={{ color: palette.warning, fontSize: 13, marginTop: space.md }}>
                {tm("tempPasswordWarning")}
              </Text>
              <Text style={{ color: palette.faint, fontSize: 12, marginTop: 4 }}>
                {tm("otpExpires", {
                  date: formatDate(created.expires_at, {
                    day: "numeric",
                    month: "long",
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                })}
              </Text>

              <Button
                label={tm("gotIt")}
                variant="outline"
                haptic="none"
                onPress={() => setCreated(null)}
                style={{ marginTop: space.md }}
              />
            </Card>
          ) : null}

          <Card>
            <View style={{ gap: space.md }}>
              <SectionTitle>{tm("addPeople")}</SectionTitle>

              <SegmentedRow<Mode>
                value={mode}
                onChange={(next) => {
                  setMode(next);
                  setError(null);
                }}
                options={[
                  { value: "student", label: tm("addStudent") },
                  { value: "parent", label: tm("addParent") },
                ]}
              />

              <Field
                label={tm("fullName")}
                value={fullName}
                onChangeText={setFullName}
              />
              <Field
                label={tm("emailLabel")}
                value={email}
                onChangeText={setEmail}
                placeholder="name@example.com"
              />

              {mode === "parent" ? (
                <>
                  <Field
                    label={tm("relation")}
                    value={relation}
                    onChangeText={setRelation}
                    placeholder={tm("relationPlaceholder")}
                  />

                  <View style={{ gap: 6 }}>
                    <Text style={{ fontSize: 13, color: palette.muted, fontWeight: "600" }}>
                      {tm("parentOf")}
                    </Text>
                    {group.enrollments.length === 0 ? (
                      <EmptyState icon="groups">{tm("noStudents")}</EmptyState>
                    ) : (
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                        {group.enrollments.map((e) => {
                          const on = child === e.studentProfileId;
                          return (
                            <Pressable
                              key={e.id}
                              accessibilityRole="button"
                              accessibilityState={{ selected: on }}
                              onPress={() => {
                                void Haptics.selectionAsync();
                                setChild(e.studentProfileId);
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
                                {e.studentName}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    )}
                  </View>
                </>
              ) : null}

              <Button
                label={mode === "student" ? tm("createStudent") : tm("createParent")}
                onPress={submit}
                busy={saving}
                disabled={!canSubmit}
                haptic="none"
              />
              <Text style={{ color: palette.faint, fontSize: 12 }}>
                {tm("accountCreateHint")}
              </Text>
            </View>
          </Card>

          <View style={{ gap: space.md }}>
            <SectionTitle>{tm("roster")}</SectionTitle>
            {group.enrollments.length === 0 ? (
              <EmptyState icon="groups">{tm("noStudents")}</EmptyState>
            ) : (
              group.enrollments.map((e) => (
                <Card
                  key={e.id}
                  onPress={() =>
                    router.push(`/(app)/student/${e.studentProfileId}`)
                  }
                >
                  <View
                    style={{ flexDirection: "row", alignItems: "center", gap: space.md }}
                  >
                    <Avatar name={e.studentName} size={36} />
                    <Text
                      style={{ flex: 1, color: palette.foreground, fontWeight: "600" }}
                    >
                      {e.studentName}
                    </Text>
                    <Text style={{ color: palette.faint, fontSize: 14 }}>›</Text>
                  </View>
                </Card>
              ))
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
