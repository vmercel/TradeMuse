/**
 * TradeMuse design tokens: professional dark fintech theme.
 * No emojis, no gradients. System fonts, tabular numerals for money.
 */

export const theme = {
  bg: "#0B0F17",
  surface: "#141B29",
  surface2: "#1A2334",
  border: "#223047",
  text: "#F2F5F9",
  muted: "#8B95A9",
  accent: "#2DD4A7", // mint
  danger: "#F6465D",
  warn: "#F0B90B",
  radius: 14,
  radiusSm: 10,
} as const;

import type { TextStyle } from "react-native";

export const moneyText: TextStyle = {
  fontVariant: ["tabular-nums"],
};
