import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { ApiError } from "@/lib/api";
import { changePassword, signOut } from "@/lib/session";
import { useSession } from "@/lib/session-context";
import { Button, ErrorNotice, Field } from "@/components/ui";
import { space, usePalette } from "@/theme";
import { tm } from "@/lib/i18n";

/**
 * Forced password rotation on first sign-in.
 *
 * This is not an optional screen: `requireApiStudent` / `requireApiMember`
 * reject **every** API call while `must_rotate_password` is set, so an account
 * that cannot rotate here can do nothing at all in the app. It was a
 * placeholder with no form, which trapped every newly created student and
 * parent on a dead end.
 *
 * Field names are snake_case because that is what the endpoint's schema
 * requires — `current_password` / `new_password` / `confirm_password`, all
 * three, with the confirmation checked server-side too.
 */
const MIN_LENGTH = 8;

export default function ChangePasswordScreen() {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const { refresh, setSession } = useSession();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const tooShort = next.length > 0 && next.length < MIN_LENGTH;
  const mismatch = confirm.length > 0 && next !== confirm;
  const canSubmit =
    current.length > 0 && next.length >= MIN_LENGTH && next === confirm && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      /**
       * `changePassword` also signs back in: the rotation revokes the tokens
       * that were issued before it, so without that the app lands
       * session-less on this very screen with the rotation already done.
       */
      const outcome = await changePassword(current, next, confirm);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (outcome === "signed-in") await refresh();
      else setSession(null);
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e instanceof ApiError ? e.message : tm("genericError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: palette.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: 24,
          paddingTop: insets.top + 24,
          gap: space.lg,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <Text style={{ fontSize: 24, fontWeight: "700", color: palette.foreground }}>
            {tm("changePasswordTitle")}
          </Text>
          <Text style={{ fontSize: 15, color: palette.muted, marginTop: 6 }}>
            {tm("changePasswordBody")}
          </Text>
        </View>

        <Field
          label={tm("currentPasswordLabel")}
          value={current}
          onChangeText={setCurrent}
          secure
        />
        <View>
          <Field label={tm("newPasswordLabel")} value={next} onChangeText={setNext} secure />
          <Text
            style={{
              fontSize: 12,
              color: tooShort ? palette.danger : palette.faint,
              marginTop: 4,
            }}
          >
            {tm("passwordMinLength", { count: MIN_LENGTH })}
          </Text>
        </View>
        <View>
          <Field
            label={tm("confirmPasswordLabel")}
            value={confirm}
            onChangeText={setConfirm}
            secure
          />
          {mismatch ? (
            <Text style={{ fontSize: 12, color: palette.danger, marginTop: 4 }}>
              {tm("passwordsDoNotMatch")}
            </Text>
          ) : null}
        </View>

        {error ? <ErrorNotice message={error} /> : null}

        <Button
          label={tm("setNewPassword")}
          onPress={submit}
          busy={busy}
          disabled={!canSubmit}
        />

        {/* Without this the only way out of a mistyped account is reinstalling
            — every other route is blocked while rotation is pending. */}
        <Button
          label={tm("signOut")}
          variant="ghost"
          haptic="none"
          onPress={async () => {
            await signOut();
            setSession(null);
          }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
