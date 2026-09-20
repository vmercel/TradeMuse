import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppStateProvider } from "../lib/store";

export default function RootLayout() {
  return (
    <AppStateProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </AppStateProvider>
  );
}
