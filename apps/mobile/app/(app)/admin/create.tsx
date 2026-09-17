import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { api } from "@/lib/api";
import { invalidate } from "@/lib/resource";
import { formatDate, tm } from "@/lib/i18n";
import type { CreatedAccount } from "@/lib/types";
import { Button, Card, ErrorNotice, Field, SegmentedRow } from "@/components/ui";
import { space, radius, usePalette } from "@/theme";

type Role = "teacher" | "parent" | "student";

const USERNAME_RE = /^[a-zA-Z0-9_-]+$/;

/**
 * Create a teacher / parent / student **account** from the phone — the mobile
 * half of the web's `students/new`, `teachers/new`, `parents/new` forms.
 *
 * The account is provisioned server-side through `/admin/people` (auth user +
 * membership + role profile + OTP issue), and the temporary password comes
 * back exactly once. The admin reads it out here and passes it to the person
 * in person, same as on web.
 */
export default function AdminCreateScreen() {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [role, setRole] = useState<Role>("teacher");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [extra, setExtra] = useState(""); // bio | relation | date_of_birth
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedAccount | null>(null);

  const isStudent = role === "student";
  const emailValid = isStudent || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const usernameValid = !isStudent || USERNAME_RE.test(username.trim());
  const ready =
    fullName.trim().length > 0 &&
    (isStudent ? username.trim().length > 0 && usernameValid : emailValid);

  const submit = async () => {
    if (!ready) return;
    setError(null);
    setBusy(true);
    void Haptics.selectionAsync();
    try {
      const body: Record<string, string> = { role, full_name: fullName.trim() };
      if (isStudent) {
        body.username = username.trim().toLowerCase();
        if (extra.trim()) body.date_of_birth = extra.trim();
      } else {
        body.email = email.trim().toLowerCase();
        if (extra.trim()) body[role === "teacher" ? "bio" : "relation"] = extra.trim();
      }
      if (phone.trim()) body.phone = phone.trim();

      const account = await api<CreatedAccount>("/admin/people", { method: "POST", body });
      invalidate("admin/students");
      invalidate("admin/teachers");
      invalidate("admin/groups");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCreated(account);
    } catch (e) {
      setError(e instanceof Error ? e.message : tm("accountCreateFailed"));
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setCreated(null);
    setFullName("");
    setEmail("");
    setUsername("");
    setPhone("");
    setExtra("");
  };

  if (created) {
    return (
      <>
        <Stack.Screen options={{ title: tm("accountCreated") }} />
        <ScrollView
          style={{ flex: 1, backgroundColor: palette.background }}
          contentContainerStyle={{
            padding: space.xl,
            gap: space.lg,
            paddingBottom: insets.bottom + space.xxl,
          }}
        >
          <Card
            style={{
              gap: space.md,
              borderColor: palette.accent,
              backgroundColor: palette.accentSubtle,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "700", color: palette.foreground }}>
              {tm("accountCreated")}
            </Text>
            <Text style={{ color: palette.muted, fontSize: 13, lineHeight: 19 }}>
              {tm("accountCreatedBody")}
            </Text>
            <View style={{ gap: 4 }}>
              <Text style={{ color: palette.faint, fontSize: 12, fontWeight: "700" }}>
                {tm("fullName")}
              </Text>
              <Text style={{ color: palette.foreground, fontSize: 15, fontWeight: "600" }}>
                {created.full_name}
              </Text>
            </View>
            <View style={{ gap: 4 }}>
              <Text style={{ color: palette.faint, fontSize: 12, fontWeight: "700" }}>
                {created.username ? tm("loginId") : tm("emailLabel")}
              </Text>
              <Text style={{ color: palette.foreground, fontSize: 15, fontWeight: "600" }}>
                {created.username ?? created.email}
              </Text>
            </View>
            <View style={{ gap: 4 }}>
              <Text style={{ color: palette.faint, fontSize: 12, fontWeight: "700" }}>
                {tm("tempPassword")}
              </Text>
              <Text
                selectable
                style={{
                  color: palette.accent,
                  fontSize: 18,
                  fontWeight: "700",
                  letterSpacing: 0.5,
                }}
              >
                {created.tempPassword}
              </Text>
            </View>
            <Text style={{ color: palette.faint, fontSize: 12 }}>
              {tm("expires")}: {formatDate(created.expires_at, { day: "numeric", month: "short", year: "numeric" })}
            </Text>
          </Card>

          <Button label={tm("done")} onPress={() => router.back()} />
          <Button label={tm("addAnother")} variant="ghost" onPress={reset} />
        </ScrollView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: tm("createAccount") }} />
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
          <SegmentedRow<Role>
            options={[
              { value: "teacher", label: tm("createAccountTeacher") },
              { value: "parent", label: tm("createAccountParent") },
              { value: "student", label: tm("createAccountStudent") },
            ]}
            value={role}
            onChange={(r) => {
              setRole(r);
              setError(null);
            }}
          />

          <Card style={{ gap: space.md }}>
            <Field label={tm("fullName")} value={fullName} onChangeText={setFullName} />

            {isStudent ? (
              <>
                <Field label={tm("username")} value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} />
                <Text style={{ color: palette.faint, fontSize: 12 }}>{tm("usernameHint")}</Text>
                {username.trim().length > 0 && !usernameValid ? (
                  <Text style={{ color: palette.danger, fontSize: 12 }}>{tm("usernameInvalid")}</Text>
                ) : null}
                <Field
                  label={`${tm("dateOfBirth")} (YYYY-MM-DD)`}
                  value={extra}
                  onChangeText={setExtra}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </>
            ) : (
              <>
                <Field
                  label={tm("emailLabel")}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Field
                  label={role === "teacher" ? tm("bio") : tm("relation")}
                  value={extra}
                  onChangeText={setExtra}
                  multiline={role === "teacher"}
                />
              </>
            )}

            <Field label={tm("phone")} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          </Card>

          {error ? <ErrorNotice message={error} /> : null}

          <Button
            label={tm("createAccount")}
            busy={busy}
            disabled={!ready}
            onPress={submit}
            style={{ borderRadius: radius.md }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
