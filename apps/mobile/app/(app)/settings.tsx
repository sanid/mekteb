import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Constants from "expo-constants";
import * as Haptics from "expo-haptics";

import { api, ApiError } from "@/lib/api";
import { changePassword, signOut } from "@/lib/session";
import { useSession } from "@/lib/session-context";
import { roleLabel, tm } from "@/lib/i18n";
import { locales, LOCALE_NAMES, type Locale } from "@mekteb/i18n";
import {
  Avatar,
  Button,
  Card,
  Chip,
  ErrorNotice,
  Field,
  SectionTitle,
  SegmentedRow,
} from "@/components/ui";
import MosqueSettings from "@/components/mosque-settings";
import {
  radius,
  space,
  usePalette,
  useThemePreference,
  THEME_PREFERENCES,
  type ThemePreference,
} from "@/theme";

/**
 * Settings and profile, for every role — the app's counterpart to the web
 * `/account` page, plus the things only a phone needs (language, sign-out).
 *
 * Account deletion lives here because both stores require it to be reachable
 * in-app (AGENTS.md §7). It does **not** delete anything: the endpoint files a
 * request an admin acts on, which is what keeps attendance and audit records
 * that a mosque is legally required to keep.
 */
const MIN_PASSWORD_LENGTH = 8;

export default function SettingsScreen() {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const { session, setSession, refresh, locale, changeLocale } = useSession();
  const { preference: theme, setPreference: setTheme } = useThemePreference();

  const [fullName, setFullName] = useState(session?.profile?.full_name ?? "");
  const [displayName, setDisplayName] = useState(session?.profile?.display_name ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const [busyAccount, setBusyAccount] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const say = (message: string) => {
    setError(null);
    setNotice(message);
  };
  const fail = (e: unknown, fallback: string) => {
    setNotice(null);
    setError(e instanceof ApiError ? e.message : fallback);
  };

  const saveProfile = async () => {
    if (savingProfile) return;
    setSavingProfile(true);
    try {
      await api("/account/profile", {
        method: "PATCH",
        body: {
          fullName: fullName.trim(),
          displayName: displayName.trim(),
        },
      });
      // `/auth/me` carries the name every other screen greets them by.
      await refresh();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      say(tm("profileSaved"));
    } catch (e) {
      fail(e, tm("profileSaveFailed"));
    } finally {
      setSavingProfile(false);
    }
  };

  const submitPassword = async () => {
    if (changingPassword) return;
    setChangingPassword(true);
    try {
      const outcome = await changePassword(current, next, confirm);
      setCurrent("");
      setNext("");
      setConfirm("");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // The rotation revoked the old tokens; `changePassword` already signed
      // back in, or gave up and signed out.
      if (outcome === "signed-in") {
        await refresh();
        say(tm("passwordChanged"));
      } else {
        setSession(null);
      }
    } catch (e) {
      fail(e, tm("genericError"));
    } finally {
      setChangingPassword(false);
    }
  };

  const requestDeletion = () => {
    Alert.alert(tm("requestDeletion"), tm("requestDeletionConfirm"), [
      { text: tm("cancel"), style: "cancel" },
      {
        text: tm("confirm"),
        style: "destructive",
        onPress: async () => {
          if (busyAccount) return;
          setBusyAccount(true);
          try {
            await api("/account/delete-request", { method: "POST", body: {} });
            say(tm("deletionRequested"));
          } catch (e) {
            fail(e, tm("deletionFailed"));
          } finally {
            setBusyAccount(false);
          }
        },
      },
    ]);
  };

  const requestExport = async () => {
    if (busyAccount) return;
    setBusyAccount(true);
    try {
      await api("/account/export", { method: "POST", body: {} });
      say(tm("exportRequested"));
    } catch (e) {
      fail(e, tm("exportFailed"));
    } finally {
      setBusyAccount(false);
    }
  };

  const name = session?.profile?.display_name ?? session?.profile?.full_name ?? "";
  const passwordReady =
    current.length > 0 &&
    next.length >= MIN_PASSWORD_LENGTH &&
    next === confirm &&
    !changingPassword;

  return (
    <>
      <Stack.Screen options={{ title: tm("settings") }} />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: palette.background }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
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
          {notice ? (
            <View
              style={{
                padding: space.md,
                borderRadius: radius.md,
                backgroundColor: palette.accentSubtle,
              }}
            >
              <Text style={{ color: palette.accent, fontSize: 14 }}>{notice}</Text>
            </View>
          ) : null}

          {/* Who you are signed in as — the question this screen is opened to
              answer on a shared family phone. */}
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
              <Avatar name={name || "?"} size={52} />
              <View style={{ flex: 1 }}>
                <Text
                  numberOfLines={1}
                  style={{ fontSize: 18, fontWeight: "700", color: palette.foreground }}
                >
                  {name}
                </Text>
                <Text style={{ color: palette.muted, fontSize: 13, marginTop: 2 }}>
                  {session?.email}
                </Text>
                {session?.mosqueName ? (
                  <Text style={{ color: palette.faint, fontSize: 12, marginTop: 2 }}>
                    {tm("mosque")}: {session.mosqueName}
                  </Text>
                ) : null}
              </View>
              {session?.roles[0] ? <Chip label={roleLabel(session.roles[0])} /> : null}
            </View>
          </Card>

          <View style={{ gap: space.md }}>
            <SectionTitle>{tm("profile")}</SectionTitle>
            <Card style={{ gap: space.md }}>
              <Field label={tm("fullName")} value={fullName} onChangeText={setFullName} />
              <Field
                label={tm("displayNameLabel")}
                value={displayName}
                onChangeText={setDisplayName}
              />
              <Button
                label={tm("saveProfile")}
                busy={savingProfile}
                disabled={!fullName.trim()}
                onPress={saveProfile}
              />
            </Card>
          </View>

          <View style={{ gap: space.md }}>
            <SectionTitle>{tm("language")}</SectionTitle>
            {/* The choice sticks across launches; the app still *starts* in
                German for anyone who has never chosen (AGENTS.md §3). */}
            <SegmentedRow<Locale>
              options={locales.map((l) => ({ value: l, label: LOCALE_NAMES[l] }))}
              value={locale}
              onChange={changeLocale}
            />
          </View>

          {/* Mosque-level settings: only the admin of the mosque sees these. */}
          {session?.roles.includes("mosque_admin") ? (
            <View style={{ gap: space.md }}>
              <SectionTitle>{tm("mosqueSettings")}</SectionTitle>
              <MosqueSettings onNotice={say} onError={fail} />
            </View>
          ) : null}

          <View style={{ gap: space.md }}>
            <SectionTitle>{tm("appearance")}</SectionTitle>
            {/* Following the device is the default and stays first: a mosque
                hall is dark while the phone is still on its daytime schedule,
                and someone reading at night has the opposite problem. */}
            <SegmentedRow<ThemePreference>
              options={THEME_PREFERENCES.map((p) => ({
                value: p,
                label:
                  p === "system"
                    ? tm("themeSystem")
                    : p === "light"
                      ? tm("themeLight")
                      : tm("themeDark"),
              }))}
              value={theme}
              onChange={setTheme}
            />
            {theme === "system" ? (
              <Text style={{ color: palette.faint, fontSize: 12 }}>
                {tm("themeSystemHint")}
              </Text>
            ) : null}
          </View>

          <View style={{ gap: space.md }}>
            <SectionTitle>{tm("security")}</SectionTitle>
            <Card style={{ gap: space.md }}>
              <Field
                label={tm("currentPasswordLabel")}
                value={current}
                onChangeText={setCurrent}
                secure
              />
              <Field
                label={tm("newPasswordLabel")}
                value={next}
                onChangeText={setNext}
                secure
              />
              <Field
                label={tm("confirmPasswordLabel")}
                value={confirm}
                onChangeText={setConfirm}
                secure
              />
              {next.length > 0 && next.length < MIN_PASSWORD_LENGTH ? (
                <Text style={{ color: palette.muted, fontSize: 12 }}>
                  {tm("passwordMinLength")}
                </Text>
              ) : null}
              {confirm.length > 0 && next !== confirm ? (
                <Text style={{ color: palette.danger, fontSize: 12 }}>
                  {tm("passwordsDoNotMatch")}
                </Text>
              ) : null}
              <Button
                label={tm("changePassword")}
                busy={changingPassword}
                disabled={!passwordReady}
                onPress={submitPassword}
              />
            </Card>
          </View>

          <View style={{ gap: space.md }}>
            <SectionTitle>{tm("dangerZone")}</SectionTitle>
            <Card style={{ gap: space.md }}>
              <Text style={{ color: palette.muted, fontSize: 13, lineHeight: 19 }}>
                {tm("requestDeletionBody")}
              </Text>
              <Button
                label={tm("requestExport")}
                variant="outline"
                disabled={busyAccount}
                onPress={requestExport}
              />
              <Button
                label={tm("requestDeletion")}
                variant="outline"
                haptic="none"
                disabled={busyAccount}
                onPress={requestDeletion}
              />
            </Card>
          </View>

          <Button
            label={tm("signOut")}
            variant="ghost"
            haptic="none"
            onPress={async () => {
              await signOut();
              setSession(null);
            }}
          />

          <Text style={{ color: palette.faint, fontSize: 12, textAlign: "center" }}>
            {tm("appVersion")} {Constants.expoConfig?.version ?? "—"}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
