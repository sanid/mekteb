import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ApiError } from "@/lib/api";
import { Button, ErrorNotice } from "@/components/ui";
import { clearPendingMfa, completeMfa } from "@/lib/session";
import { useSession } from "@/lib/session-context";
import { radius, space, usePalette } from "@/theme";
import { tm } from "@/lib/i18n";

/**
 * The second step of a 2FA sign-in: the authenticator code for the verified
 * factor. Reached from sign-in when the API reports `mfaRequired`.
 *
 * The password-step session is only held aside (see `session.ts`) — nothing
 * here touches the stored session until the code verifies, so a wrong or
 * abandoned code leaves the previous user exactly where they were.
 */
export default function MfaScreen() {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { refresh } = useSession();

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState(false);

  const submit = async () => {
    if (busy || code.trim().length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      await completeMfa(code);
      // The verified session is stored; the root layout routes to the app.
      await refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : tm("mfaVerifyFailed"));
    } finally {
      setBusy(false);
    }
  };

  const backToSignIn = async () => {
    await clearPendingMfa();
    router.replace("/(auth)/sign-in");
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
          padding: space.xl,
          paddingTop: insets.top + space.xxl,
          paddingBottom: insets.bottom + space.xxl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text
          style={{
            fontSize: 28,
            fontWeight: "700",
            letterSpacing: -0.6,
            color: palette.foreground,
            textAlign: "center",
          }}
        >
          {tm("mfaTitle")}
        </Text>
        <Text
          style={{
            marginTop: 8,
            fontSize: 15,
            color: palette.muted,
            textAlign: "center",
            lineHeight: 21,
          }}
        >
          {tm("mfaHint")}
        </Text>

        <View
          style={{
            marginTop: space.xl,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: palette.cardBorder,
            backgroundColor: palette.card,
            padding: space.xl,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              letterSpacing: 0.6,
              textTransform: "uppercase",
              color: palette.faint,
              marginBottom: 7,
            }}
          >
            {tm("mfaCodeLabel")}
          </Text>
          <TextInput
            value={code}
            onChangeText={(t) => setCode(t.replace(/[^0-9]/g, "").slice(0, 6))}
            keyboardType="number-pad"
            autoFocus
            maxLength={6}
            placeholder="••••••"
            placeholderTextColor={palette.faint}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onSubmitEditing={submit}
            returnKeyType="go"
            style={{
              borderWidth: 1,
              borderColor: focused ? palette.accent : palette.cardBorder,
              backgroundColor: palette.background,
              color: palette.foreground,
              borderRadius: radius.md,
              paddingHorizontal: 14,
              paddingVertical: 13,
              fontSize: 24,
              fontWeight: "700",
              letterSpacing: 10,
              textAlign: "center",
            }}
          />

          {error ? (
            <View style={{ marginTop: space.lg }}>
              <ErrorNotice message={error} />
            </View>
          ) : null}

          <Button
            label={tm("mfaVerifyButton")}
            onPress={submit}
            busy={busy}
            disabled={code.trim().length !== 6}
            style={{ marginTop: space.xl }}
          />

          <Button
            label={tm("mfaBackToLogin")}
            variant="ghost"
            onPress={backToSignIn}
            haptic="none"
            style={{ marginTop: space.sm }}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
