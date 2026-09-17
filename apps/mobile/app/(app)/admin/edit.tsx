import { useCallback, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { api } from "@/lib/api";
import { invalidate, useResource } from "@/lib/resource";
import { tm } from "@/lib/i18n";
import { Button, Card, ErrorNotice, FirstLoad, SectionTitle } from "@/components/ui";
import { radius, space, usePalette } from "@/theme";

/**
 * Edit a student or teacher from the admin directory.
 *
 * Loads the current row (fresh, so the form starts from what is actually
 * stored) and saves through the same admin API the web portal uses. Students
 * and teachers differ enough that the fields are chosen by the `type` param;
 * everything else is shared.
 */
type EditType = "student" | "teacher";

const inputStyle = (palette: ReturnType<typeof usePalette>) => ({
  borderRadius: radius.md,
  borderWidth: 1,
  borderColor: palette.cardBorder,
  backgroundColor: palette.surface,
  paddingHorizontal: space.md,
  paddingVertical: space.sm,
  fontSize: 15,
  color: palette.foreground,
});

export default function AdminEditScreen() {
  const { type, id } = useLocalSearchParams<{ type: string; id: string }>();
  const editType = (type === "teacher" ? "teacher" : "student") as EditType;
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data, error } = useResource<Record<string, unknown>>(
    id ? `admin/edit/${editType}/${id}` : null,
    useCallback(
      () => api<Record<string, unknown>>(`/admin/${editType}s/${id}`),
      [editType, id],
    ),
    { fallbackError: tm("loadFailed") },
  );

  const student = (data as { student?: Record<string, unknown> } | null)?.student;
  const teacher = data as {
    profiles?: Record<string, unknown>;
    bio?: string | null;
    is_active?: boolean;
  } | null;

  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Seed the form once, when the detail arrives.
  if (data && !initialized) {
    setInitialized(true);
    if (editType === "student" && student) {
      setFullName(String(student.full_name ?? ""));
      setDateOfBirth(String(student.date_of_birth ?? ""));
      setActive(!!student.is_active);
    } else if (teacher) {
      const prof = teacher.profiles as { full_name?: string | null } | null;
      setFullName(prof?.full_name ?? "");
      setPhone(String((teacher.profiles as { phone?: string | null } | null)?.phone ?? ""));
      setBio(teacher.bio ?? "");
      setActive(!!teacher.is_active);
    }
  }

  const save = async () => {
    if (!fullName.trim()) return;
    setSaveError(null);
    setBusy(true);
    void Haptics.selectionAsync();
    try {
      const body: Record<string, unknown> = { full_name: fullName.trim() };
      if (editType === "student") {
        body.date_of_birth = dateOfBirth.trim() || null;
        body.is_active = active;
        await api(`/admin/students/${id}`, { method: "PUT", body });
      } else {
        body.phone = phone.trim() || null;
        body.bio = bio.trim() || null;
        await api(`/admin/teachers/${id}`, { method: "PUT", body });
      }
      invalidate("admin/students");
      invalidate("admin/teachers");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : tm("saveFailed"));
      setBusy(false);
    }
  };

  if (data === null) {
    return (
      <>
        <Stack.Screen options={{ title: editType === "teacher" ? tm("editTeacher") : tm("editStudent") }} />
        <FirstLoad error={error} />
      </>
    );
  }

  const label = (text: string) => (
    <Text style={{ fontSize: 13, fontWeight: "700", color: palette.muted, marginTop: space.sm }}>{text}</Text>
  );

  return (
    <>
      <Stack.Screen options={{ title: editType === "teacher" ? tm("editTeacher") : tm("editStudent") }} />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: palette.background }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            padding: space.xl,
            paddingBottom: insets.bottom + space.xxl,
            gap: space.sm,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Card style={{ gap: space.sm, padding: space.lg }}>
            {label(tm("fullName"))}
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder={tm("fullName")}
              style={inputStyle(palette)}
            />

            {editType === "student" ? (
              <>
                {label(tm("dateOfBirth"))}
                <TextInput
                  value={dateOfBirth}
                  onChangeText={setDateOfBirth}
                  placeholder="YYYY-MM-DD"
                  autoCapitalize="none"
                  style={inputStyle(palette)}
                />
              </>
            ) : (
              <>
                {label(tm("phone"))}
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder={tm("phone")}
                  keyboardType="phone-pad"
                  style={inputStyle(palette)}
                />
                {label(tm("bio"))}
                <TextInput
                  value={bio}
                  onChangeText={setBio}
                  placeholder={tm("bio")}
                  multiline
                  style={[inputStyle(palette), { minHeight: 80, textAlignVertical: "top" }]}
                />
              </>
            )}

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: space.sm,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: palette.foreground }}>
                {tm("active")}
              </Text>
              <Switch
                value={active}
                onValueChange={(v) => {
                  void Haptics.selectionAsync();
                  setActive(v);
                }}
                trackColor={{ true: palette.accent, false: palette.cardBorder }}
                thumbColor="#fff"
              />
            </View>
          </Card>

          {saveError ? <ErrorNotice message={saveError} /> : null}

          <Button label={tm("save")} onPress={save} busy={busy} disabled={!fullName.trim()} />
          <Button
            label={tm("cancel")}
            variant="ghost"
            onPress={() => router.back()}
            disabled={busy}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
