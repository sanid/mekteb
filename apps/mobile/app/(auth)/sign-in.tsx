import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import Svg, { Circle, Path } from "react-native-svg";

import { ApiError } from "@/lib/api";
import { Button, ErrorNotice } from "@/components/ui";
import { signIn } from "@/lib/session";
import { useSession } from "@/lib/session-context";
import { radius, space, useIsDark, usePalette } from "@/theme";
import { tm } from "@/lib/i18n";

/**
 * The Mekteb mark — the pointed mihrab arch and its finial, the same geometry
 * as the web app's `MosqueIcon`. Filled rather than stroked so it holds up at
 * any size without a stroke width to retune.
 */
function MosqueMark({ color, size = 40 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M5 21.5V13.8A11 11 0 0 1 12 3.55A11 11 0 0 1 19 13.8V21.5Z M7.6 21.5V13.8A8.4 8.4 0 0 1 12 6.41A8.4 8.4 0 0 1 16.4 13.8V21.5Z"
        fill={color}
        fillRule="evenodd"
      />
      <Circle cx={12} cy={1.55} r={1.15} fill={color} />
    </Svg>
  );
}

/** Eye / eye-with-slash for the password reveal toggle. */
function EyeIcon({ color, off }: { color: string; off: boolean }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 14.8a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6Z"
        stroke={color}
        strokeWidth={1.6}
      />
      {off ? (
        <Path d="M4 20 20 4" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      ) : null}
    </Svg>
  );
}

export default function SignInScreen() {
  const palette = usePalette();
  const isDark = useIsDark();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setSession } = useSession();

  // A scan-to-login QR deep link (`mekteb://sign-in?u=…&p=…`) lands here with
  // the credentials; pre-fill them so the person only has to press sign in.
  // The params carry the same plaintext the staff member shared anyway.
  const params = useLocalSearchParams<{ u?: string | string[]; p?: string | string[] }>();
  const qrLogin = Array.isArray(params.u) ? params.u[0] : params.u;
  const qrPassword = Array.isArray(params.p) ? params.p[0] : params.p;
  const fromQr = !!qrLogin && !!qrPassword;

  const [login, setLogin] = useState(qrLogin ?? "");
  const [password, setPassword] = useState(qrPassword ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reveal, setReveal] = useState(false);
  /** Which field owns the keyboard — drives the accent focus ring. */
  const [focused, setFocused] = useState<"login" | "password" | null>(null);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await signIn(login, password);
      if (result.mfaRequired) {
        // The password step is done; the code screen completes the session.
        router.replace("/(auth)/mfa");
        return;
      }
      // The sign-in response already carries the full session — no `/auth/me`
      // round-trip — so set it and let the root layout route straight home.
      setSession(result.session);
    } catch (e) {
      // `error` from the API is already localised and sanitised server-side.
      setError(e instanceof ApiError ? e.message : tm("genericError"));
    } finally {
      setBusy(false);
    }
  };

  const fieldStyle = (name: "login" | "password") =>
    ({
      borderWidth: 1,
      borderColor: focused === name ? palette.accent : palette.cardBorder,
      backgroundColor: palette.background,
      color: palette.foreground,
      borderRadius: radius.md,
      paddingHorizontal: 14,
      paddingVertical: 13,
      fontSize: 16,
    }) as const;

  const label = (text: string) => (
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
      {text}
    </Text>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: palette.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* A soft accent wash behind the top of the screen, so signing in feels
          like part of the brand rather than a bare system form. */}
      <LinearGradient
        colors={[
          isDark ? "rgba(34,197,94,0.16)" : "rgba(22,163,74,0.14)",
          isDark ? "rgba(34,197,94,0.04)" : "rgba(22,163,74,0.03)",
          "transparent",
        ]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 380 }}
        pointerEvents="none"
      />

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
        <View style={{ alignItems: "center", marginBottom: space.xxl }}>
          <View
            style={{
              width: 68,
              height: 68,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: palette.card,
              borderWidth: 1,
              borderColor: palette.cardBorder,
              shadowColor: palette.accent,
              shadowOpacity: isDark ? 0.35 : 0.18,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 10 },
              elevation: 4,
            }}
          >
            <MosqueMark color={palette.accent} />
          </View>

          <Text
            style={{
              marginTop: space.lg,
              fontSize: 32,
              fontWeight: "700",
              letterSpacing: -0.6,
              color: palette.foreground,
            }}
          >
            {tm("signInWelcome")}
          </Text>
          <Text
            style={{
              marginTop: 6,
              fontSize: 15,
              color: palette.muted,
              textAlign: "center",
            }}
          >
            {tm("signInTitle")}
          </Text>
        </View>

        <View
          style={{
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: palette.cardBorder,
            backgroundColor: palette.card,
            padding: space.xl,
            shadowColor: "#000",
            shadowOpacity: isDark ? 0.4 : 0.06,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 12 },
            elevation: 3,
          }}
        >
          {fromQr ? (
            <View
              style={{
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: palette.accent,
                backgroundColor: palette.accentSubtle,
                paddingHorizontal: space.md,
                paddingVertical: space.sm,
                marginBottom: space.md,
              }}
            >
              <Text style={{ fontSize: 13, color: palette.accent, fontWeight: "600" }}>
                {tm("qrCredentialsFilled")}
              </Text>
            </View>
          ) : null}

          {/* Deliberately not "Email": students sign in with a mosque-qualified
              username such as al-nour.amina (AGENTS.md §4). */}
          {label(tm("loginLabel"))}
          <TextInput
            value={login}
            onChangeText={setLogin}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="username"
            placeholder={tm("loginPlaceholder")}
            placeholderTextColor={palette.faint}
            onFocus={() => setFocused("login")}
            onBlur={() => setFocused(null)}
            style={[fieldStyle("login"), { marginBottom: space.lg }]}
          />

          {label(tm("passwordLabel"))}
          <View style={{ justifyContent: "center" }}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!reveal}
              autoCapitalize="none"
              textContentType="password"
              onSubmitEditing={submit}
              onFocus={() => setFocused("password")}
              onBlur={() => setFocused(null)}
              returnKeyType="go"
              style={[fieldStyle("password"), { paddingRight: 48 }]}
            />
            <Pressable
              onPress={() => setReveal((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={tm(reveal ? "hidePassword" : "showPassword")}
              hitSlop={10}
              style={{ position: "absolute", right: 12 }}
            >
              <EyeIcon color={palette.faint} off={reveal} />
            </Pressable>
          </View>

          {error ? (
            <View style={{ marginTop: space.lg }}>
              <ErrorNotice message={error} />
            </View>
          ) : null}

          <Button
            label={tm("signIn")}
            onPress={submit}
            busy={busy}
            disabled={!login || !password}
            style={{ marginTop: space.xl }}
          />

          {/* Password reset lives behind an email link (the recovery link
              opens in the browser), so the app only needs to start the
              request — no token handling, no deep-link plumbing. */}
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/(auth)/forgot-password")}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, marginTop: space.lg })}
          >
            <Text
              style={{
                color: palette.accent,
                fontSize: 14,
                fontWeight: "600",
                textAlign: "center",
              }}
            >
              {tm("forgotPassword")}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
