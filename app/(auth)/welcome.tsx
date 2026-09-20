/**
 * Welcome screen: brand, value proposition, entry to signup / login.
 */

import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { GhostButton, Muted, PrimaryButton, theme } from "../../components/ui";

const points: Array<{ icon: keyof typeof Ionicons.glyphMap; text: string }> = [
  { icon: "wallet-outline", text: "Paper trading with real market data" },
  { icon: "sparkles-outline", text: "AI trade proposals you approve" },
  { icon: "shield-checkmark-outline", text: "Guardrails and an instant kill switch" },
];

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.body}>
        <View style={styles.mark}>
          <Text style={styles.markText}>TM</Text>
        </View>
        <Text style={styles.brand}>TradeMuse</Text>
        <Text style={styles.tagline}>
          Professional paper trading, guided by Muse.
        </Text>

        <View style={styles.points}>
          {points.map((p) => (
            <View key={p.icon} style={styles.point}>
              <View style={styles.pointIcon}>
                <Ionicons name={p.icon} size={20} color={theme.accent} />
              </View>
              <Text style={styles.pointText}>{p.text}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <PrimaryButton
          title="Create account"
          onPress={() => router.push("/(auth)/signup")}
        />
        <GhostButton title="Log in" onPress={() => router.push("/(auth)/login")} />
        <Muted style={styles.disclaimer}>
          Trading involves risk, including possible loss of principal. Paper
          trading uses simulated funds.
        </Muted>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: theme.bg, flex: 1 },
  body: { alignItems: "center", flex: 1, justifyContent: "center", padding: 24 },
  mark: {
    alignItems: "center",
    backgroundColor: theme.surface,
    borderColor: theme.accent,
    borderRadius: 24,
    borderWidth: 2,
    height: 92,
    justifyContent: "center",
    width: 92,
  },
  markText: { color: theme.accent, fontSize: 34, fontWeight: "800" },
  brand: {
    color: theme.text,
    fontSize: 32,
    fontWeight: "800",
    marginTop: 18,
  },
  tagline: {
    color: theme.muted,
    fontSize: 16,
    marginTop: 8,
    textAlign: "center",
  },
  points: { gap: 14, marginTop: 36, width: "100%" },
  point: { alignItems: "center", flexDirection: "row", gap: 14 },
  pointIcon: {
    alignItems: "center",
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderRadius: 12,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  pointText: { color: theme.text, flex: 1, fontSize: 15, fontWeight: "600" },
  footer: { gap: 4, padding: 24 },
  disclaimer: { marginTop: 12, textAlign: "center" },
});
