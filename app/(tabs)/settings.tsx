/**
 * Settings tab: trading mode, guardrails, kill switch, backend URL.
 * Live mode is hard gated: choosing it opens a risk disclosure sheet,
 * and the mode stays PAPER until the backend enables live trading.
 */

import { useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppState } from "../../lib/store";
import {
  Card,
  Muted,
  PrimaryButton,
  SectionTitle,
  formatMoney,
  theme,
} from "../../components/ui";

function RiskDisclosureSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { acknowledgeLiveRisk } = useAppState();
  const [understood, setUnderstood] = useState(false);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.sheetBackdrop}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Risk disclosure</Text>
          <ScrollView style={styles.sheetBody}>
            <Text style={styles.sheetText}>
              Live trading puts real money at risk. Prices move fast, orders
              can fill at worse prices than expected, and you can lose part or
              all of the capital you commit.
            </Text>
            <Text style={styles.sheetText}>
              This app routes orders through a licensed broker API. The app
              developers do not provide investment advice, and past mock
              performance says nothing about future results.
            </Text>
            <Text style={styles.sheetText}>
              Even after you acknowledge this notice, live trading stays OFF
              until the backend enables it. The backend also enforces your
              guardrails and the kill switch server side.
            </Text>
            <TouchableOpacity
              style={styles.checkRow}
              onPress={() => setUnderstood((v) => !v)}
            >
              <View
                style={[styles.checkbox, understood && styles.checkboxOn]}
              >
                {understood && <Text style={styles.checkmark}>{"\u2713"}</Text>}
              </View>
              <Text style={styles.checkLabel}>
                I understand that live trading involves real financial risk.
              </Text>
            </TouchableOpacity>
          </ScrollView>
          <PrimaryButton
            title="Acknowledge"
            disabled={!understood}
            onPress={() => {
              acknowledgeLiveRisk();
              setUnderstood(false);
              onClose();
            }}
          />
          <TouchableOpacity
            style={styles.sheetCancel}
            onPress={() => {
              setUnderstood(false);
              onClose();
            }}
          >
            <Text style={styles.sheetCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function SettingsScreen() {
  const {
    mode,
    guardrails,
    backendUrl,
    liveRiskAcknowledged,
    setMode,
    updateGuardrails,
    setBackendUrlValue,
  } = useAppState();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [maxPosition, setMaxPosition] = useState(
    String(guardrails.maxPositionSize)
  );
  const [maxLoss, setMaxLoss] = useState(String(guardrails.maxDailyLoss));
  const [saved, setSaved] = useState(false);

  const saveGuardrails = () => {
    const pos = parseFloat(maxPosition);
    const loss = parseFloat(maxLoss);
    updateGuardrails({
      maxPositionSize: pos > 0 ? pos : guardrails.maxPositionSize,
      maxDailyLoss: loss > 0 ? loss : guardrails.maxDailyLoss,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Settings</Text>

        <SectionTitle>Trading mode</SectionTitle>
        <View style={styles.segmented}>
          <TouchableOpacity
            style={[styles.segment, mode === "paper" && styles.segmentActive]}
            onPress={() => setMode("paper")}
          >
            <Text
              style={[
                styles.segmentText,
                mode === "paper" && styles.segmentTextActive,
              ]}
            >
              Paper
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segment, mode === "live" && styles.segmentActive]}
            onPress={() => setSheetVisible(true)}
          >
            <Text
              style={[
                styles.segmentText,
                mode === "live" && styles.segmentTextActive,
              ]}
            >
              Live
            </Text>
          </TouchableOpacity>
        </View>
        <Card style={styles.modeNote}>
          <Muted>
            {liveRiskAcknowledged
              ? "Risk disclosure acknowledged. Live trading is still OFF: the backend must enable it before real orders can be placed."
              : "Paper is the only functional mode. Tapping Live opens the risk disclosure; the mode stays Paper until the backend enables live trading."}
          </Muted>
        </Card>

        <SectionTitle>Guardrails</SectionTitle>
        <Card>
          <Text style={styles.label}>Max position size (USD per order)</Text>
          <TextInput
            style={styles.input}
            value={maxPosition}
            onChangeText={setMaxPosition}
            keyboardType="decimal-pad"
            placeholderTextColor={theme.muted}
          />
          <Text style={styles.label}>Max daily loss (USD)</Text>
          <TextInput
            style={styles.input}
            value={maxLoss}
            onChangeText={setMaxLoss}
            keyboardType="decimal-pad"
            placeholderTextColor={theme.muted}
          />
          <PrimaryButton
            title={saved ? "Saved" : "Save guardrails"}
            onPress={saveGuardrails}
          />
          <Muted style={styles.hint}>
            Orders above {formatMoney(guardrails.maxPositionSize)} are blocked
            on the Trade tab.
          </Muted>
        </Card>

        <SectionTitle>Kill switch</SectionTitle>
        <Card style={guardrails.killSwitch ? styles.killOn : undefined}>
          <View style={styles.killRow}>
            <View style={styles.killText}>
              <Text style={styles.killTitle}>Block all order placement</Text>
              <Muted>
                When on, the Trade confirm button and all proposal approvals
                are disabled immediately.
              </Muted>
            </View>
            <Switch
              value={guardrails.killSwitch}
              onValueChange={(v) => updateGuardrails({ killSwitch: v })}
              trackColor={{ false: theme.border, true: theme.red }}
              thumbColor="#FFFFFF"
            />
          </View>
        </Card>

        <SectionTitle>Backend</SectionTitle>
        <Card>
          <Text style={styles.label}>Backend URL</Text>
          <TextInput
            style={styles.input}
            value={backendUrl}
            onChangeText={setBackendUrlValue}
            placeholder="https://your-backend.example.com"
            placeholderTextColor={theme.muted}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Muted>
            Used when the real backend replaces the mock layer. Broker API
            keys are never stored in this app.
          </Muted>
        </Card>

        <SectionTitle>About</SectionTitle>
        <Card>
          <Muted>TradingApp 0.1.0 (scaffold)</Muted>
          <Muted>Paper trading only. Mock data. No real money.</Muted>
        </Card>
      </ScrollView>

      <RiskDisclosureSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: theme.bg, flex: 1 },
  scroll: { padding: 16, paddingBottom: 32 },
  title: {
    color: theme.text,
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 12,
  },
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
  modeNote: { marginTop: 10 },
  label: {
    color: theme.text,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: theme.surface2,
    borderColor: theme.border,
    borderRadius: 10,
    borderWidth: 1,
    color: theme.text,
    fontSize: 16,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  hint: { marginTop: 10 },
  killOn: { borderColor: theme.red },
  killRow: { alignItems: "center", flexDirection: "row", gap: 12 },
  killText: { flex: 1, gap: 4 },
  killTitle: { color: theme.text, fontSize: 15, fontWeight: "700" },
  sheetBackdrop: {
    backgroundColor: "rgba(0,0,0,0.6)",
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: theme.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
    padding: 20,
  },
  sheetTitle: {
    color: theme.text,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 12,
  },
  sheetBody: { marginBottom: 16 },
  sheetText: {
    color: theme.text,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  checkRow: { alignItems: "center", flexDirection: "row", gap: 12, marginTop: 8 },
  checkbox: {
    alignItems: "center",
    borderColor: theme.border,
    borderRadius: 6,
    borderWidth: 2,
    height: 26,
    justifyContent: "center",
    width: 26,
  },
  checkboxOn: { backgroundColor: theme.accent, borderColor: theme.accent },
  checkmark: { color: "#FFFFFF", fontWeight: "800" },
  checkLabel: { color: theme.text, flex: 1, fontSize: 14, lineHeight: 20 },
  sheetCancel: { alignItems: "center", marginTop: 12, paddingVertical: 8 },
  sheetCancelText: { color: theme.muted, fontSize: 15, fontWeight: "600" },
});
