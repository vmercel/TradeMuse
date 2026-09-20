/**
 * TradeMuse shared UI kit: theme re-export plus small primitives.
 * Dark fintech look. No emojis, no gradients.
 */

import { useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme, moneyText } from "../lib/theme";

export { theme, moneyText };

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

export function formatMoney(n: number, signed = false): string {
  const sign = signed && n > 0 ? "+" : n < 0 ? "-" : "";
  const abs = Math.abs(n);
  const body = abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}$${body}`;
}

export function formatPercent(n: number, signed = true): string {
  const sign = signed && n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/* ------------------------------------------------------------------ */
/* Layout primitives                                                   */
/* ------------------------------------------------------------------ */

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function Muted({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

export function EmptyState({
  icon,
  title,
  message,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
}) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name={icon} size={40} color={theme.border} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {message ? <Muted style={styles.emptyMessage}>{message}</Muted> : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

export function PrimaryButton({
  title,
  onPress,
  disabled,
  loading,
  danger,
  style,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  danger?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const inactive = disabled || loading;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={inactive}
      activeOpacity={0.85}
      style={[
        styles.button,
        danger && styles.buttonDanger,
        inactive && styles.buttonDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={theme.text} />
      ) : (
        <Text
          style={[styles.buttonText, inactive && styles.buttonTextDisabled]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

export function GhostButton({
  title,
  onPress,
  style,
}: {
  title: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.ghostButton, style]}
    >
      <Text style={styles.ghostButtonText}>{title}</Text>
    </TouchableOpacity>
  );
}

/* ------------------------------------------------------------------ */
/* Field: label + input + inline error, focus ring                      */
/* ------------------------------------------------------------------ */

interface FieldProps extends Omit<TextInputProps, "style"> {
  label?: string;
  error?: string;
  hint?: string;
  toggleSecure?: boolean;
}

export function Field({
  label,
  error,
  hint,
  toggleSecure,
  secureTextEntry,
  onFocus,
  onBlur,
  ...rest
}: FieldProps) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secureTextEntry);
  const showToggle = toggleSecure && secureTextEntry;

  return (
    <View style={styles.fieldWrap}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <View
        style={[
          styles.fieldBox,
          focused && styles.fieldBoxFocused,
          error ? styles.fieldBoxError : undefined,
        ]}
      >
        <TextInput
          style={styles.fieldInput}
          placeholderTextColor={theme.muted}
          secureTextEntry={showToggle ? hidden : secureTextEntry}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {showToggle ? (
          <TouchableOpacity
            onPress={() => setHidden((h) => !h)}
            hitSlop={12}
            accessibilityLabel={hidden ? "Show password" : "Hide password"}
          >
            <Ionicons
              name={hidden ? "eye-outline" : "eye-off-outline"}
              size={20}
              color={theme.muted}
            />
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
      {!error && hint ? <Muted style={styles.fieldHint}>{hint}</Muted> : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Password strength meter                                             */
/* ------------------------------------------------------------------ */

export function passwordScore(pw: string): number {
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  return Math.min(score, 4);
}

const strengthLabels = ["Too weak", "Weak", "Fair", "Good", "Strong"];

export function PasswordStrength({ password }: { password: string }) {
  if (password.length === 0) return null;
  const score = passwordScore(password);
  const color =
    score <= 1 ? theme.danger : score === 2 ? theme.warn : theme.accent;
  return (
    <View style={styles.strengthWrap}>
      <View style={styles.strengthBars}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.strengthBar,
              { backgroundColor: i < score ? color : theme.border },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.strengthLabel, { color }]}>
        {strengthLabels[score]}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* CodeInput: one-time code entry                                       */
/* ------------------------------------------------------------------ */

export function CodeInput({
  length = 6,
  value,
  onChange,
  onComplete,
  autoFocus,
}: {
  length?: number;
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  autoFocus?: boolean;
}) {
  const refs = useRef<Array<TextInput | null>>([]);
  const chars = value.padEnd(length, " ").slice(0, length).split("");

  const setAt = (index: number, ch: string) => {
    const next = value.padEnd(length, " ").split("");
    next[index] = ch;
    const joined = next.join("").replace(/ /g, "").slice(0, length);
    onChange(joined);
    if (joined.length === length) onComplete?.(joined);
  };

  return (
    <View style={styles.codeRow}>
      {chars.map((ch, i) => (
        <TextInput
          key={i}
          ref={(r) => {
            refs.current[i] = r;
          }}
          style={[
            styles.codeBox,
            ch !== " " ? styles.codeBoxFilled : undefined,
          ]}
          value={ch === " " ? "" : ch}
          onChangeText={(t) => {
            const digit = t.replace(/[^0-9]/g, "").slice(-1);
            if (digit) {
              setAt(i, digit);
              if (i < length - 1) refs.current[i + 1]?.focus();
            } else if (t === "") {
              setAt(i, " ");
            }
          }}
          onKeyPress={({ nativeEvent }) => {
            if (nativeEvent.key === "Backspace" && chars[i] === " " && i > 0) {
              setAt(i - 1, " ");
              refs.current[i - 1]?.focus();
            }
          }}
          keyboardType="number-pad"
          maxLength={1}
          autoFocus={autoFocus && i === 0}
          selectTextOnFocus
        />
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* SegmentedControl                                                    */
/* ------------------------------------------------------------------ */

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  labels,
  style,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
  labels?: Partial<Record<T, string>>;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.segmented, style]}>
      {options.map((opt) => {
        const active = opt === value;
        return (
          <TouchableOpacity
            key={opt}
            style={[styles.segment, active && styles.segmentActive]}
            onPress={() => onChange(opt)}
            activeOpacity={0.85}
          >
            <Text
              style={[styles.segmentText, active && styles.segmentTextActive]}
            >
              {labels?.[opt] ?? opt}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* ChangePill                                                          */
/* ------------------------------------------------------------------ */

export function ChangePill({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: positive ? "#0E2E25" : "#3A1720" },
      ]}
    >
      <Text
        style={[
          styles.pillText,
          { color: positive ? theme.accent : theme.danger },
        ]}
      >
        {formatPercent(value)}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderRadius: theme.radius,
    borderWidth: 1,
    padding: 16,
  },
  sectionTitle: {
    color: theme.text,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.4,
    marginBottom: 10,
    marginTop: 20,
    textTransform: "uppercase",
  },
  muted: {
    color: theme.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  emptyState: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 40,
  },
  emptyTitle: {
    color: theme.text,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 8,
  },
  emptyMessage: { textAlign: "center", maxWidth: 280 },
  button: {
    alignItems: "center",
    backgroundColor: theme.accent,
    borderRadius: theme.radius,
    minHeight: 54,
    justifyContent: "center",
    paddingVertical: 14,
  },
  buttonDanger: {
    backgroundColor: "transparent",
    borderColor: theme.danger,
    borderWidth: 1.5,
  },
  buttonDisabled: {
    backgroundColor: theme.surface2,
    borderColor: theme.border,
    borderWidth: 1,
    opacity: 0.7,
  },
  buttonText: {
    color: "#06281F",
    fontSize: 16,
    fontWeight: "800",
  },
  buttonTextDisabled: {
    color: theme.muted,
  },
  ghostButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  ghostButtonText: {
    color: theme.accent,
    fontSize: 15,
    fontWeight: "700",
  },
  fieldWrap: { marginBottom: 14 },
  fieldLabel: {
    color: theme.text,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
  },
  fieldBox: {
    alignItems: "center",
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderRadius: theme.radiusSm,
    borderWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 14,
  },
  fieldBoxFocused: {
    borderColor: theme.accent,
    borderWidth: 1.5,
  },
  fieldBoxError: {
    borderColor: theme.danger,
  },
  fieldInput: {
    color: theme.text,
    flex: 1,
    fontSize: 16,
    paddingVertical: 13,
  },
  fieldError: {
    color: theme.danger,
    fontSize: 12,
    marginTop: 5,
  },
  fieldHint: { marginTop: 5 },
  strengthWrap: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
    marginTop: -6,
  },
  strengthBars: { flex: 1, flexDirection: "row", gap: 6 },
  strengthBar: { borderRadius: 3, flex: 1, height: 5 },
  strengthLabel: { fontSize: 12, fontWeight: "700" },
  codeRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    marginVertical: 8,
  },
  codeBox: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderRadius: theme.radiusSm,
    borderWidth: 1,
    color: theme.text,
    fontSize: 24,
    fontWeight: "800",
    height: 58,
    textAlign: "center",
    width: 50,
  },
  codeBoxFilled: { borderColor: theme.accent },
  segmented: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderRadius: theme.radius,
    borderWidth: 1,
    flexDirection: "row",
    overflow: "hidden",
  },
  segment: { alignItems: "center", flex: 1, paddingVertical: 12 },
  segmentActive: { backgroundColor: theme.surface2 },
  segmentText: { color: theme.muted, fontSize: 15, fontWeight: "600" },
  segmentTextActive: { color: theme.text, fontWeight: "700" },
  pill: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
