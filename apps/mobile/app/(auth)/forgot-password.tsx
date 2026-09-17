import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, ApiError } from "@/lib/api";
import { Button, ErrorNotice } from "@/components/ui";
import { radius, space, usePalette } from "@/theme";
import { tm } from "@/lib/i18n";

/**
 * Starts a password reset by email. The recovery link itself opens in the
 * browser (it carries Supabase's token hash, which the app has no deep-link
 * route for), so this screen only requests the email and confirms — exactly
 * the boundary the web flow draws too.
 *
 * The API always answers success (no email enumeration) and rate-limits per
 * address, so there is nothing to verify here beyond a non-empty input.
 */
export default function ForgotPasswordScreen() {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [focused, setFocused] = useState(false);

  const submit = async () => {
    if (busy || !email.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api("/auth/forgot-password", {
        method: "POST",
        body: { email: email.trim() },
        auth: false,
      });
      setSent(true);
    } catch (e) {
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
          {tm("forgotPasswordTitle")}
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
          {tm("forgotPasswordHint")}
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
          {sent ? (
            <View
              style={{
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: palette.accent,
                backgroundColor: palette.accentSubtle,
                padding: space.md,
              }}
            >
              <Text style={{ fontSize: 14, color: palette.accent, lineHeight: 20, fontWeight: "600" }}>
                {tm("forgotPasswordSent")}
              </Text>
            </View>
          ) : (
            <>
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
                {tm("loginLabel")}
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                placeholder={tm("loginPlaceholder")}
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
                  fontSize: 16,
                }}
              />

              {error ? (
                <View style={{ marginTop: space.lg }}>
                  <ErrorNotice message={error} />
                </View>
              ) : null}

              <Button
                label={tm("sendResetLink")}
                onPress={submit}
                busy={busy}
                disabled={!email.trim()}
                style={{ marginTop: space.xl }}
              />
            </>
          )}

          <Button
            label={tm("backToSignIn")}
            variant="ghost"
            onPress={() => router.replace("/(auth)/sign-in")}
            haptic="none"
            style={{ marginTop: space.sm }}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
