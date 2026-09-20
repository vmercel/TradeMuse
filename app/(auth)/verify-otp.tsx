/**
 * OTP verification: 6-box code input, 60s resend cooldown,
 * then verifyOtp -> session -> tabs.
 */

import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  CodeInput,
  Muted,
  PrimaryButton,
  theme,
} from "../../components/ui";
import { resendOtp, verifyOtp } from "../../lib/api";

const COOLDOWN = 60;

export default function VerifyOtpScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const address = Array.isArray(email) ? email[0] : email ?? "";
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(COOLDOWN);
  const [resending, setResending] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timer.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1 && timer.current) {
          clearInterval(timer.current);
          timer.current = null;
        }
        return Math.max(0, c - 1);
      });
    }, 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const doVerify = async (fullCode: string) => {
    if (fullCode.length < 6 || verifying) return;
    setError(null);
    setVerifying(true);
    try {
      await verifyOtp(address, fullCode);
      router.replace("/(tabs)");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
      setCode("");
    } finally {
      setVerifying(false);
    }
  };

  const doResend = async () => {
    if (cooldown > 0 || resending) return;
    setError(null);
    setResending(true);
    try {
      await resendOtp(address);
      setCooldown(COOLDOWN);
      const t = setInterval(() => {
        setCooldown((c) => {
          if (c <= 1) clearInterval(t);
          return Math.max(0, c - 1);
        });
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend the code.");
    } finally {
      setResending(false);
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

          <Text style={styles.title}>Check your email</Text>
          <Muted style={styles.subtitle}>
            We sent a 6-digit code to{" "}
            <Text style={styles.email}>{address || "your email"}</Text>. Enter
            it below to verify your account.
          </Muted>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <CodeInput
            value={code}
            onChange={setCode}
            onComplete={doVerify}
            autoFocus
          />

          <PrimaryButton
            title={verifying ? "Verifying..." : "Verify"}
            onPress={() => doVerify(code)}
            loading={verifying}
            disabled={code.length < 6}
            style={styles.verify}
          />

          <View style={styles.resendRow}>
            <Muted>Did not get the code? </Muted>
            <TouchableOpacity
              onPress={doResend}
              disabled={cooldown > 0 || resending}
            >
              <Text
                style={[
                  styles.resend,
                  (cooldown > 0 || resending) && styles.resendDisabled,
                ]}
              >
                {resending
                  ? "Sending..."
                  : cooldown > 0
                    ? `Resend in ${cooldown}s`
                    : "Resend code"}
              </Text>
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
  subtitle: { marginBottom: 20, marginTop: 8 },
  email: { color: theme.text, fontWeight: "700" },
  error: {
    backgroundColor: "#3A1720",
    borderRadius: theme.radiusSm,
    color: theme.danger,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 14,
    padding: 12,
  },
  verify: { marginTop: 20 },
  resendRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 18,
  },
  resend: { color: theme.accent, fontSize: 14, fontWeight: "700" },
  resendDisabled: { color: theme.muted },
});
