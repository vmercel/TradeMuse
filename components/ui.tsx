/**
 * Shared theme and small UI primitives for TradingApp.
 * Dark trading-desk theme used across all tabs.
 */

import type { ReactNode } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

export const theme = {
  bg: "#0B0E14",
  surface: "#151A24",
  surface2: "#1C2331",
  border: "#232B3A",
  text: "#E8ECF3",
  muted: "#8A94A6",
  accent: "#3B82F6",
  green: "#22C55E",
  red: "#EF4444",
  amber: "#F59E0B",
  radius: 12,
};

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
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

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

export function Muted({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

export function PrimaryButton({
  title,
  onPress,
  disabled,
  danger,
  style,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={[
        styles.button,
        danger && styles.buttonDanger,
        disabled && styles.buttonDisabled,
        style,
      ]}
    >
      <Text style={[styles.buttonText, disabled && styles.buttonTextDisabled]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

export function ChangePill({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: positive ? "#12331F" : "#3A1720" },
      ]}
    >
      <Text
        style={[
          styles.pillText,
          { color: positive ? theme.green : theme.red },
        ]}
      >
        {formatPercent(value)}
      </Text>
    </View>
  );
}

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
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 10,
    marginTop: 4,
  },
  muted: {
    color: theme.muted,
    fontSize: 13,
  },
  button: {
    alignItems: "center",
    backgroundColor: theme.accent,
    borderRadius: theme.radius,
    paddingVertical: 16,
  },
  buttonDanger: {
    backgroundColor: "#7F1D1D",
  },
  buttonDisabled: {
    backgroundColor: theme.surface2,
    borderColor: theme.border,
    borderWidth: 1,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  buttonTextDisabled: {
    color: theme.muted,
  },
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
