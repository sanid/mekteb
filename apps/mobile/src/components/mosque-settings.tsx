import { useCallback, useState } from "react";
import { Pressable, Switch, Text, TextInput, View } from "react-native";
import * as Haptics from "expo-haptics";

import { api } from "@/lib/api";
import { useResource } from "@/lib/resource";
import { tm } from "@/lib/i18n";
import type { PluginState, PrayerSettings } from "@/lib/types";
import { Button, Card, ErrorNotice, FirstLoad, SectionTitle } from "@/components/ui";
import { radius, space, usePalette } from "@/theme";

/** The methods `lib/prayer-times.ts` exposes — the only valid values to store. */
const PRAYER_METHODS = ["MWL", "ISNA", "Egypt", "Makkah", "Karachi", "Tehran", "Jafari"] as const;

/**
 * The admin's mosque-level settings on the phone: where the prayer timetable
 * is computed for, and the per-mosque feature switches. Both map to the same
 * `/admin/settings/*` API the web settings page saves through.
 */
export default function MosqueSettings({
  onNotice,
  onError,
}: {
  onNotice: (message: string) => void;
  /** `(e, fallback)` — mirrors the settings screen's `fail` so errors show once. */
  onError: (e: unknown, fallback: string) => void;
}) {
  const palette = usePalette();

  const prayer = useResource<PrayerSettings>(
    "admin/settings/prayer",
    useCallback(() => api<PrayerSettings>("/admin/settings/prayer"), []),
    { fallbackError: tm("loadFailed") },
  );
  const plugins = useResource<{ plugins: PluginState[] }>(
    "admin/settings/plugins",
    useCallback(() => api<{ plugins: PluginState[] }>("/admin/settings/plugins"), []),
    { fallbackError: tm("loadFailed") },
  );

  const [location, setLocation] = useState("");
  const [method, setMethod] = useState<string>("MWL");
  const [seeded, setSeeded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  if (prayer.data && !seeded) {
    setSeeded(true);
    setLocation(prayer.data.prayer_location ?? "");
    setMethod(prayer.data.prayer_method || "MWL");
  }

  const savePrayer = async () => {
    if (saving || !location.trim()) return;
    setSaving(true);
    try {
      await api("/admin/settings/prayer", {
        method: "PUT",
        body: { prayer_location: location.trim(), prayer_method: method },
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onNotice(tm("prayerSaved"));
    } catch (e) {
      onError(e, tm("saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const togglePlugin = async (plugin: PluginState) => {
    if (toggling) return;
    setToggling(plugin.id);
    void Haptics.selectionAsync();
    try {
      await api("/admin/settings/plugins", {
        method: "PUT",
        body: { plugin_id: plugin.id, is_active: !plugin.is_active },
      });
      plugins.refresh();
    } catch (e) {
      onError(e, tm("pluginToggleFailed"));
    } finally {
      setToggling(null);
    }
  };

  if (prayer.data === null && plugins.data === null) {
    return <FirstLoad error={prayer.error ?? plugins.error} />;
  }

  return (
    <View style={{ gap: space.lg }}>
      {/* ── Prayer times ─────────────────────────────────────────────────── */}
      <View style={{ gap: space.md }}>
        <SectionTitle>{tm("prayerSettings")}</SectionTitle>
        <Card style={{ gap: space.md }}>
          <Text style={{ fontSize: 13, color: palette.muted, fontWeight: "600" }}>
            {tm("prayerLocation")}
          </Text>
          <TextInput
            value={location}
            onChangeText={setLocation}
            placeholder={tm("prayerLocationPlaceholder")}
            placeholderTextColor={palette.faint}
            autoCapitalize="words"
            style={{
              borderWidth: 1,
              borderColor: palette.cardBorder,
              backgroundColor: palette.card,
              color: palette.foreground,
              borderRadius: radius.md,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontSize: 16,
            }}
          />
          <Text style={{ fontSize: 13, color: palette.muted, fontWeight: "600" }}>
            {tm("prayerMethod")}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.xs }}>
            {PRAYER_METHODS.map((m) => {
              const active = m === method;
              return (
                <Pressable
                  key={m}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setMethod(m);
                  }}
                  style={({ pressed }) => ({
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: radius.pill,
                    borderWidth: 1.5,
                    borderColor: active ? palette.accent : palette.cardBorder,
                    backgroundColor: active ? palette.accentSubtle : "transparent",
                    opacity: pressed ? 0.65 : 1,
                  })}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: active ? "800" : "600",
                      color: active ? palette.accent : palette.muted,
                    }}
                  >
                    {m}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Button
            label={tm("save")}
            busy={saving}
            disabled={!location.trim()}
            onPress={savePrayer}
          />
        </Card>
      </View>

      {/* ── Feature switches ─────────────────────────────────────────────── */}
      <View style={{ gap: space.md }}>
        <SectionTitle>{tm("featureSwitches")}</SectionTitle>
        {plugins.data === null ? (
          <ErrorNotice message={plugins.error ?? ""} />
        ) : plugins.data.plugins.length === 0 ? (
          <ErrorNotice message={tm("loadFailed")} />
        ) : (
          <Card style={{ gap: 2 }}>
            {plugins.data.plugins.map((plugin, i) => (
              <View
                key={plugin.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: space.md,
                  paddingVertical: space.sm + 2,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: palette.cardBorder,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: palette.foreground, fontWeight: "600", fontSize: 14 }}>
                    {plugin.name}
                  </Text>
                  <Text style={{ color: palette.muted, fontSize: 12, marginTop: 2 }}>
                    {plugin.description}
                  </Text>
                </View>
                <Switch
                  value={plugin.is_active}
                  disabled={toggling === plugin.id}
                  onValueChange={() => void togglePlugin(plugin)}
                  trackColor={{ true: palette.accent, false: palette.cardBorder }}
                  thumbColor="#fff"
                />
              </View>
            ))}
          </Card>
        )}
      </View>
    </View>
  );
}
