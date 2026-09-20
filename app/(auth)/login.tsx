/**
 * Login screen: email + password, error states, link to signup.
 * If the account is not verified yet, offer to jump to verify-otp.
 */

import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Field, Muted, PrimaryButton, theme } from "../../components/ui";
import { signIn } from "../../lib/api";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setNeedsVerification(false);
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setSubmitting(true);
    try {
      await signIn(email, password);
      router.replace("/(tabs)");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed.";
      setError(message);
      if (/verify your email/i.test(message)) setNeedsVerification(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.body}>
          <TouchableOpacity
            style={styles.back}
            onPress={() => router.back()}
            hitSlop={12}
          >
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </TouchableOpacity>

          <Text style={styles.title}>Welcome back</Text>
          <Muted style={styles.subtitle}>Log in to your TradeMuse account.</Muted>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
              {needsVerification ? (
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: "/(auth)/verify-otp",
                      params: { email: email.trim() },
                    })
                  }
                >
                  <Text style={styles.verifyLink}>Enter verification code</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          <Field
            label="Email"
            value={email}
            onChangeText={(t) => setEmail(t)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            placeholder="jane@example.com"
          />
          <Field
            label="Password"
            value={password}
            onChangeText={(t) => setPassword(t)}
            secureTextEntry
            toggleSecure
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="password"
            placeholder="Your password"
            onSubmitEditing={onSubmit}
            returnKeyType="go"
          />

          <PrimaryButton
            title="Log in"
            onPress={onSubmit}
            loading={submitting}
            style={styles.submit}
          />

          <View style={styles.signupRow}>
            <Text style={styles.signupText}>New to TradeMuse? </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
              <Text style={styles.signupLink}>Create an account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: theme.bg, flex: 1 },
  flex: { flex: 1 },
  body: { flex: 1, padding: 24 },
  back: { marginBottom: 12, alignSelf: "flex-start", padding: 4 },
  title: { color: theme.text, fontSize: 28, fontWeight: "800" },
  subtitle: { marginBottom: 20, marginTop: 6 },
  errorBox: {
    backgroundColor: "#3A1720",
    borderRadius: theme.radiusSm,
    gap: 8,
    marginBottom: 14,
    padding: 12,
  },
  errorText: { color: theme.danger, fontSize: 14, fontWeight: "600" },
  verifyLink: { color: theme.accent, fontSize: 14, fontWeight: "700" },
  submit: { marginTop: 8 },
  signupRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 18,
  },
  signupText: { color: theme.muted, fontSize: 14 },
  signupLink: { color: theme.accent, fontSize: 14, fontWeight: "700" },
});
