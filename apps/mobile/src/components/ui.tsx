import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  FadeIn,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import Svg, { Circle } from "react-native-svg";

import { radius, space, usePalette } from "@/theme";
import { Icon, type IconName } from "./icon";

/**
 * The shared surfaces. Deliberately small — the web app accumulated the same
 * card styling pasted 75 times before it was named once, and starting with
 * named primitives avoids repeating that.
 *
 * Everything pressable animates and (where it commits something) gives haptic
 * feedback: this app is used one-handed, standing up, mid-lesson.
 */

export function Card({
  children,
  style,
  onPress,
}: {
  children: ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}) {
  const palette = usePalette();
  const scale = useSharedValue(1);

  const base: ViewStyle = {
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    backgroundColor: palette.card,
  };

  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (!onPress) return <View style={[base, style]}>{children}</View>;

  return (
    <Animated.View style={animated}>
      <Pressable
        accessibilityRole="button"
        onPressIn={() => {
          scale.set(withSpring(0.975, { damping: 18, stiffness: 320 }));
        }}
        onPressOut={() => {
          scale.set(withSpring(1, { damping: 18, stiffness: 320 }));
        }}
        onPress={onPress}
        style={[base, style]}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  const palette = usePalette();
  return (
    <View
      style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: "600",
          color: palette.muted,
          textTransform: "uppercase",
          letterSpacing: 0.7,
        }}
      >
        {children}
      </Text>
      {right}
    </View>
  );
}

/**
 * A card's heading line: accent icon, title, and whatever the card wants on the
 * right (a chip, a chevron). Every navigational card uses this, so the icon
 * always sits the same distance from the same-sized title.
 */
export function IconTitle({
  icon,
  children,
  right,
}: {
  icon: IconName;
  children: ReactNode;
  right?: ReactNode;
}) {
  const palette = usePalette();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
      <Icon name={icon} size={18} color={palette.accent} />
      <Text
        style={{ flex: 1, fontSize: 16, fontWeight: "700", color: palette.foreground }}
      >
        {children}
      </Text>
      {right}
    </View>
  );
}

export function EmptyState({ children, icon }: { children: ReactNode; icon?: IconName }) {
  const palette = usePalette();
  return (
    <View
      style={{
        paddingVertical: space.xxl,
        paddingHorizontal: space.xl,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: palette.cardBorder,
        alignItems: "center",
        gap: space.sm,
      }}
    >
      {icon ? <Icon name={icon} size={26} color={palette.faint} strokeWidth={1.5} /> : null}
      <Text style={{ color: palette.muted, textAlign: "center", fontSize: 14 }}>
        {children}
      </Text>
    </View>
  );
}

export function ErrorNotice({ message }: { message: string }) {
  const palette = usePalette();
  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      style={{
        padding: space.md,
        borderRadius: radius.md,
        backgroundColor: palette.dangerSubtle,
        borderWidth: 1,
        borderColor: palette.danger + "55",
      }}
    >
      <Text style={{ color: palette.danger, fontSize: 14 }}>{message}</Text>
    </Animated.View>
  );
}

export function Button({
  label,
  icon,
  onPress,
  variant = "primary",
  busy,
  disabled,
  style,
  haptic = "light",
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  variant?: "primary" | "outline" | "ghost";
  busy?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  haptic?: "light" | "success" | "none";
}) {
  const palette = usePalette();
  const scale = useSharedValue(1);
  const isDisabled = disabled || busy;
  const primary = variant === "primary";

  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const fire = () => {
    if (haptic === "success") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (haptic === "light") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Animated.View style={animated}>
      <Pressable
        onPress={fire}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: !!isDisabled, busy: !!busy }}
        onPressIn={() => {
          scale.set(withSpring(0.97, { damping: 18, stiffness: 340 }));
        }}
        onPressOut={() => {
          scale.set(withSpring(1, { damping: 18, stiffness: 340 }));
        }}
        style={[
          {
            minHeight: 52,
            paddingVertical: 12,
            paddingHorizontal: space.lg,
            borderRadius: radius.md,
            flexDirection: "row",
            gap: space.sm,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: primary
              ? palette.accent
              : variant === "ghost"
                ? "transparent"
                : palette.card,
            borderWidth: variant === "ghost" ? 0 : primary ? 0 : 1,
            borderColor: palette.cardBorder,
            opacity: isDisabled ? 0.45 : 1,
          },
          style,
        ]}
      >
        {busy ? (
          <ActivityIndicator color={primary ? palette.onAccent : palette.muted} />
        ) : (
          <>
            {icon ? (
              <Icon
                name={icon}
                size={17}
                color={primary ? palette.onAccent : palette.accent}
              />
            ) : null}
            <Text
              style={{
                color: primary ? palette.onAccent : palette.foreground,
                fontWeight: "600",
                fontSize: 16,
              }}
            >
              {label}
            </Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

export function Loading() {
  const palette = usePalette();
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: palette.background,
      }}
    >
      <ActivityIndicator color={palette.accent} />
    </View>
  );
}

/** Circular initials, so lists of people are scannable without photos. */
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const palette = usePalette();
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: palette.accentSubtle,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: palette.accent, fontWeight: "700", fontSize: size * 0.36 }}>
        {initials || "?"}
      </Text>
    </View>
  );
}

/** Horizontal progress bar that animates to its new value. */
export function ProgressBar({ value, tint }: { value: number; tint?: string }) {
  const palette = usePalette();
  const clamped = Math.max(0, Math.min(1, value));
  const width = useSharedValue(clamped);
  width.value = withTiming(clamped, { duration: 320 });

  const animated = useAnimatedStyle(() => ({ width: `${width.value * 100}%` }));

  return (
    <View
      style={{
        height: 6,
        borderRadius: radius.pill,
        backgroundColor: palette.cardBorder,
        overflow: "hidden",
      }}
    >
      <Animated.View
        style={[
          { height: "100%", borderRadius: radius.pill, backgroundColor: tint ?? palette.accent },
          animated,
        ]}
      />
    </View>
  );
}

/**
 * Progress ring for memorisation. A ring reads as an achievement in a way a
 * bar does not, which is the point for a student watching it fill over months.
 */
export function ProgressRing({
  value,
  size = 96,
  stroke = 9,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
}) {
  const palette = usePalette();
  const clamped = Math.max(0, Math.min(1, value));
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={palette.cardBorder}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={palette.accent}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - clamped)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

/** Small status/label chip. */
export function Chip({
  label,
  fg,
  bg,
}: {
  label: string;
  fg?: string;
  bg?: string;
}) {
  const palette = usePalette();
  return (
    <View
      style={{
        paddingHorizontal: space.sm + 2,
        paddingVertical: 4,
        borderRadius: radius.pill,
        backgroundColor: bg ?? palette.surface,
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: "600", color: fg ?? palette.muted }}>
        {label}
      </Text>
    </View>
  );
}

/**
 * Labelled text input.
 *
 * The one place input styling is defined — sign-in still carries its own copy
 * from before this existed and should move over when it is next touched.
 */
export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  autoFocus = false,
  editable = true,
  secure = false,
  autoCapitalize,
  autoCorrect,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  autoFocus?: boolean;
  editable?: boolean;
  /** Masks input and turns off autocorrect/autocapitalise — passwords only. */
  secure?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoCorrect?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad" | "number-pad";
}) {
  const palette = usePalette();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 13, color: palette.muted, fontWeight: "600" }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.faint}
        multiline={multiline}
        autoFocus={autoFocus}
        editable={editable}
        secureTextEntry={secure}
        autoCapitalize={autoCapitalize ?? (secure ? "none" : "sentences")}
        autoCorrect={autoCorrect ?? !secure}
        keyboardType={keyboardType}
        textAlignVertical={multiline ? "top" : "center"}
        style={{
          borderWidth: 1,
          borderColor: palette.cardBorder,
          backgroundColor: palette.card,
          color: palette.foreground,
          borderRadius: radius.sm,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontSize: 16,
          minHeight: multiline ? 96 : 48,
        }}
      />
    </View>
  );
}

/**
 * A row of mutually exclusive choices — used where a native picker would be
 * heavier than the decision deserves (audience, due-date presets).
 */
export function SegmentedRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const palette = usePalette();
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => {
              void Haptics.selectionAsync();
              onChange(option.value);
            }}
            style={({ pressed }) => ({
              flex: 1,
              paddingVertical: 10,
              paddingHorizontal: 4,
              borderRadius: radius.sm,
              alignItems: "center",
              borderWidth: 1.5,
              borderColor: active ? palette.accent : palette.cardBorder,
              backgroundColor: active ? palette.accentSubtle : "transparent",
              opacity: pressed ? 0.65 : 1,
            })}
          >
            <Text
              numberOfLines={1}
              style={{
                fontSize: 12,
                fontWeight: active ? "800" : "600",
                color: active ? palette.accent : palette.muted,
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * What a screen shows before it has ever loaded its data: a spinner, or the
 * error if the very first fetch failed.
 *
 * Without the error branch a screen whose first request fails spins forever —
 * cached data cannot cover for it, because there is none yet.
 */
export function FirstLoad({ error }: { error: string | null }) {
  const palette = usePalette();
  if (!error) return <Loading />;
  return (
    <View style={{ flex: 1, padding: space.xl, backgroundColor: palette.background }}>
      <ErrorNotice message={error} />
    </View>
  );
}

/**
 * A two-or-more way switch between views of the same screen.
 *
 * Extracted from the calendar's scope switch when the inbox needed the same
 * control: two screens rolling their own segmented control is how the app ends
 * up with two segmented controls that look almost alike.
 */
export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
  style?: ViewStyle;
}) {
  const palette = usePalette();
  return (
    <View
      style={[
        {
          flexDirection: "row",
          gap: space.xs,
          padding: 3,
          borderRadius: radius.md,
          backgroundColor: palette.surface,
          borderWidth: 1,
          borderColor: palette.cardBorder,
        },
        style,
      ]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => {
              if (selected) return;
              void Haptics.selectionAsync();
              onChange(option.value);
            }}
            style={({ pressed }) => ({
              flex: 1,
              paddingVertical: space.sm,
              borderRadius: radius.sm,
              alignItems: "center",
              backgroundColor: selected ? palette.card : "transparent",
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: selected ? "800" : "600",
                color: selected ? palette.accent : palette.muted,
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * A round icon button for a screen header.
 *
 * `badge` is a count, not a boolean: a bell with "3" on it says something a
 * dot cannot, and the inbox is the one place in the app where the number is
 * the point. Above 99 it says "99+" rather than widening the circle.
 */
export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  badge = 0,
}: {
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  badge?: number;
}) {
  const palette = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: radius.pill,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: palette.card,
        borderWidth: 1,
        borderColor: palette.cardBorder,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Icon name={icon} size={19} color={palette.foreground} />
      {badge > 0 ? (
        <View
          style={{
            position: "absolute",
            top: -3,
            right: -3,
            minWidth: 18,
            height: 18,
            paddingHorizontal: 4,
            borderRadius: radius.pill,
            backgroundColor: palette.accent,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2,
            borderColor: palette.background,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: "700", color: palette.onAccent }}>
            {badge > 99 ? "99+" : badge}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
