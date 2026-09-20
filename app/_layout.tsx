/**
 * Root layout: auth provider, app state, and the auth gate.
 * Unauthenticated users are redirected to /(auth)/welcome;
 * authenticated users go to /(tabs). Cold start shows a splash
 * while the session is restored from SecureStore.
 */

import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Stack, router, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "../lib/auth";
import { AppStateProvider } from "../lib/store";
import { theme } from "../lib/theme";

function SplashScreen() {
  return (
    <View style={styles.splash}>
      <View style={styles.mark}>
        <Text style={styles.markText}>TM</Text>
      </View>
      <Text style={styles.brand}>TradeMuse</Text>
      <ActivityIndicator color={theme.accent} style={styles.spinner} />
    </View>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!session && !inAuthGroup) {
      router.replace("/(auth)/welcome");
    } else if (session && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [session, loading, segments]);

  if (loading) return <SplashScreen />;
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppStateProvider>
        <StatusBar style="light" />
        <AuthGate>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </AuthGate>
      </AppStateProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    alignItems: "center",
    backgroundColor: theme.bg,
    flex: 1,
    justifyContent: "center",
  },
  mark: {
    alignItems: "center",
    backgroundColor: theme.surface,
    borderColor: theme.accent,
    borderRadius: 20,
    borderWidth: 2,
    height: 76,
    justifyContent: "center",
    width: 76,
  },
  markText: {
    color: theme.accent,
    fontSize: 28,
    fontWeight: "800",
  },
  brand: {
    color: theme.text,
    fontSize: 26,
    fontWeight: "800",
    marginTop: 16,
  },
  spinner: { marginTop: 24 },
});
