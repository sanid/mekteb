import { useEffect, useRef, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import * as Notifications from "expo-notifications";

import { getSession, type Session } from "@/lib/session";
import { ApiError } from "@/lib/api";
import { getLocale, setLocale } from "@/lib/i18n";
import { getPref, PREF_LOCALE, setPref } from "@/lib/prefs";
import { isLocale, type Locale } from "@mekteb/i18n";
import { SessionContext } from "@/lib/session-context";
import { registerForPush, routeForNotification } from "@/lib/push";
import { ThemeProvider, useArabicFont, useIsDark, usePalette } from "@/theme";

// Side effect: registers the headless task that renders the Android widget
// (open.md §3.4). Must run at bundle load, so it lives at module scope here.
import "@/widgets/task-handler";

/**
 * The provider has to sit *above* everything that reads a palette — including
 * the layout itself, which paints the splash overlay and the stack header.
 * Hence the split: this component exists only to wrap.
 */
export default function RootLayout() {
  return (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );
}

function App() {
  const palette = usePalette();
  const isDark = useIsDark();
  // Warmed here rather than in the reader so the Quran text is already set in
  // Amiri on first paint instead of reflowing from the system face.
  useArabicFont();
  const router = useRouter();
  const segments = useSegments();

  const [session, setSessionState] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [locale, setLocaleState] = useState<Locale>(getLocale());

  /**
   * Setting a session *is* sign-in completing — the sign-in response carries
   * the full session, so no `/auth/me` round-trip runs on that path — so the
   * splash ends the moment a session exists. `setSession(null)` (sign-out, a
   * 401) must never clear it early.
   */
  const setSession = (s: Session | null) => {
    setSessionState(s);
    if (s) setLoading(false);
  };

  const refresh = async () => {
    try {
      setSession(await getSession());
    } catch (e) {
      // Only a definitive session loss (401 after a failed refresh) means
      // "signed out". An offline/timeout/throttled error with a valid token
      // must not bounce a real session to the login screen — keep the cached
      // one and let the next refresh retry.
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        setSession(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, []);

  /**
   * A language choice used to last until the app was killed — the app is
   * German-first by design (AGENTS.md §3), so every launch reset a Bosnian
   * family back to German. Loaded once, before anything the user reads.
   */
  useEffect(() => {
    void getPref(PREF_LOCALE).then((stored) => {
      if (stored && isLocale(stored)) {
        setLocale(stored);
        setLocaleState(stored);
      }
    });
  }, []);

  const changeLocale = (next: Locale) => {
    setLocale(next);
    setLocaleState(next);
    void setPref(PREF_LOCALE, next);
  };

  /**
   * Register for push once there is a usable session — not before. A user who
   * still has to rotate their password has no working API access yet, and
   * `/devices` would just 401.
   */
  const userId = session?.userId;
  const mustRotate = session?.mustRotatePassword ?? true;
  useEffect(() => {
    if (!userId || mustRotate) return;
    void registerForPush();
  }, [userId, mustRotate]);

  /**
   * Tapping a notification opens what it is about.
   *
   * `useLastNotificationResponse` rather than a listener: a tap that *launches*
   * a killed app is delivered before any listener this tree could add, so a
   * cold-start tap would land on the home screen instead. The identifier guard
   * keeps a remount from navigating a second time on the same tap.
   */
  const lastResponse = Notifications.useLastNotificationResponse();
  const handledResponse = useRef<string | null>(null);
  const signedIn = !!userId && !mustRotate;
  useEffect(() => {
    if (!lastResponse || !signedIn) return;
    const id = lastResponse.notification.request.identifier;
    if (handledResponse.current === id) return;
    handledResponse.current = id;
    router.push(routeForNotification(lastResponse.notification.request.content.data));
  }, [lastResponse, signedIn, router]);

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === "(auth)";

    if (!session && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
    } else if (
      !session &&
      inAuthGroup &&
      segments[1] !== "sign-in" &&
      segments[1] !== "mfa" &&
      segments[1] !== "forgot-password"
    ) {
      // Losing the session *inside* the auth group used to strand the user:
      // change-password is reachable without one, and none of the branches
      // below match, so the screen just sat there. Sign-in is the only
      // sensible destination when there is nothing to authenticate with —
      // except the MFA code screen and forgot-password, which are reached
      // *from* sign-in and legitimately hold no stored session yet.
      router.replace("/(auth)/sign-in");
    } else if (session?.mustRotatePassword && segments[1] !== "change-password") {
      // Forced rotation outranks everything else, exactly as on the web.
      router.replace("/(auth)/change-password");
    } else if (session && !session.mustRotatePassword && inAuthGroup) {
      router.replace("/(app)");
    }
  }, [session, loading, segments, router]);

  return (
    <SessionContext.Provider value={{ session, refresh, setSession, locale, changeLocale }}>
      <SafeAreaProvider>
        <StatusBar style={isDark ? "light" : "dark"} />

        {/*
          The navigator must render on *every* pass, including while the
          session is still resolving. Returning a bare loading View here
          instead — as this did — means expo-router never mounts its
          navigation tree, so the redirect effect above has nothing to
          navigate and the app sits on a blank screen forever.

          The splash overlay below covers the first frames instead.
        */}
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: palette.surface },
            headerTintColor: palette.foreground,
            contentStyle: { backgroundColor: palette.background },
          }}
        >
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
        </Stack>

        {loading ? (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: palette.background,
            }}
          >
            <ActivityIndicator color={palette.accent} />
          </View>
        ) : null}
      </SafeAreaProvider>
    </SessionContext.Provider>
  );
}
