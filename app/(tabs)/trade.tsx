/**
 * Trade tab: manual order ticket.
 * Paper mode executes against the mock layer. Live mode is hard gated:
 * the confirm button is inert until the backend enables live trading.
 */

import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, type Order, type OrderType, type Side } from "../../lib/api";
import { useAppState } from "../../lib/store";
import {
  Card,
  Muted,
  PrimaryButton,
  SectionTitle,
  formatMoney,
  theme,
} from "../../components/ui";

function Segmented<T extends string>({
  options,
  value,
  onChange,
  labels,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
  labels?: Partial<Record<T, string>>;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((opt) => {
        const active = opt === value;
        return (
          <TouchableOpacity
            key={opt}
            style={[styles.segment, active && styles.segmentActive]}
            onPress={() => onChange(opt)}
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

export default function TradeScreen() {
  const { mode, guardrails } = useAppState();
  const [symbol, setSymbol] = useState("");
  const [qty, setQty] = useState("");
  const [side, setSide] = useState<Side>("buy");
  const [orderType, setOrderType] = useState<OrderType>("market");
  const [limitPrice, setLimitPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<Order | null>(null);

  const liveMode = mode === "live";
  const killSwitchOn = guardrails.killSwitch;

  const qtyNum = useMemo(() => parseInt(qty, 10), [qty]);
  const limitNum = useMemo(() => parseFloat(limitPrice), [limitPrice]);
  const cleanSymbol = symbol.trim().toUpperCase();

  const estimatedValue = useMemo(() => {
    if (!qtyNum || qtyNum <= 0) return 0;
    if (orderType === "limit" && limitNum > 0) return qtyNum * limitNum;
    return 0; // market orders price at fill time; shown after confirm
  }, [qtyNum, orderType, limitNum]);

  const exceedsPositionLimit =
    estimatedValue > 0 && estimatedValue > guardrails.maxPositionSize;

  const confirmDisabled =
    submitting ||
    liveMode ||
    killSwitchOn ||
    cleanSymbol.length === 0 ||
    !qtyNum ||
    qtyNum <= 0 ||
    (orderType === "limit" && !(limitNum > 0)) ||
    exceedsPositionLimit;

  const onConfirm = async () => {
    setError(null);
    setConfirmation(null);
    if (liveMode) {
      setError("Live trading is disabled until the backend enables it.");
      return;
    }
    if (killSwitchOn) {
      setError("Kill switch is on. All order placement is blocked.");
      return;
    }
    setSubmitting(true);
    try {
      const order = await api.placeOrder(
        {
          symbol: cleanSymbol,
          qty: qtyNum,
          side,
          type: orderType,
          limitPrice: orderType === "limit" ? limitNum : undefined,
        },
        mode
      );
      setConfirmation(order);
      setQty("");
      setLimitPrice("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Order failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.header}>
            <Text style={styles.title}>Trade</Text>
            <View
              style={[
                styles.modeBadge,
                liveMode ? styles.modeBadgeLive : styles.modeBadgePaper,
              ]}
            >
              <Text
                style={[
                  styles.modeText,
                  { color: liveMode ? theme.red : theme.green },
                ]}
              >
                {liveMode ? "LIVE (DISABLED)" : "PAPER TRADING"}
              </Text>
            </View>
          </View>

          {liveMode && (
            <Card style={styles.warnCard}>
              <Text style={styles.warnTitle}>Live trading is not available</Text>
              <Muted>
                Manual live orders are hard gated. The backend must enable live
                trading before this ticket can place real orders.
              </Muted>
            </Card>
          )}

          {killSwitchOn && (
            <Card style={styles.warnCard}>
              <Text style={styles.warnTitle}>Kill switch is on</Text>
              <Muted>
                All order placement is blocked. Turn the kill switch off in
                Settings to trade again.
              </Muted>
            </Card>
          )}

          <SectionTitle>Side</SectionTitle>
          <Segmented<Side>
            options={["buy", "sell"]}
            value={side}
            onChange={setSide}
            labels={{ buy: "Buy", sell: "Sell" }}
          />

          <SectionTitle>Symbol</SectionTitle>
          <TextInput
            style={styles.input}
            placeholder="e.g. AAPL"
            placeholderTextColor={theme.muted}
            value={symbol}
            onChangeText={setSymbol}
            autoCapitalize="characters"
            autoCorrect={false}
          />

          <SectionTitle>Quantity (shares)</SectionTitle>
          <TextInput
            style={styles.input}
            placeholder="e.g. 10"
            placeholderTextColor={theme.muted}
            value={qty}
            onChangeText={setQty}
            keyboardType="number-pad"
          />

          <SectionTitle>Order type</SectionTitle>
          <Segmented<OrderType>
            options={["market", "limit"]}
            value={orderType}
            onChange={setOrderType}
            labels={{ market: "Market", limit: "Limit" }}
          />

          {orderType === "limit" && (
            <>
              <SectionTitle>Limit price</SectionTitle>
              <TextInput
                style={styles.input}
                placeholder="e.g. 230.00"
                placeholderTextColor={theme.muted}
                value={limitPrice}
                onChangeText={setLimitPrice}
                keyboardType="decimal-pad"
              />
            </>
          )}

          <SectionTitle>Order preview</SectionTitle>
          <Card>
            <View style={styles.previewRow}>
              <Muted>Order</Muted>
              <Text style={styles.previewValue}>
                {side === "buy" ? "Buy" : "Sell"} {qtyNum > 0 ? qtyNum : "-"} {cleanSymbol || "-"}
              </Text>
            </View>
            <View style={styles.previewRow}>
              <Muted>Type</Muted>
              <Text style={styles.previewValue}>
                {orderType === "market"
                  ? "Market"
                  : `Limit @ ${limitNum > 0 ? formatMoney(limitNum) : "-"}`}
              </Text>
            </View>
            <View style={styles.previewRow}>
              <Muted>Estimated value</Muted>
              <Text style={styles.previewValue}>
                {estimatedValue > 0
                  ? formatMoney(estimatedValue)
                  : "Priced at fill"}
              </Text>
            </View>
            <View style={styles.previewRow}>
              <Muted>Position limit</Muted>
              <Text
                style={[
                  styles.previewValue,
                  exceedsPositionLimit && { color: theme.red },
                ]}
              >
                {formatMoney(guardrails.maxPositionSize)}
                {exceedsPositionLimit ? " (exceeded)" : ""}
              </Text>
            </View>
          </Card>

          {error && <Text style={styles.error}>{error}</Text>}

          <PrimaryButton
            title={
              submitting
                ? "Placing order..."
                : liveMode
                  ? "Live trading disabled"
                  : killSwitchOn
                    ? "Blocked by kill switch"
                    : `Confirm ${side === "buy" ? "Buy" : "Sell"} ${cleanSymbol || ""}`.trim()
            }
            onPress={onConfirm}
            disabled={confirmDisabled}
            style={styles.confirm}
          />

          {confirmation && (
            <Card style={styles.confirmCard}>
              <Text style={styles.confirmTitle}>Order confirmed (paper)</Text>
              <Muted>Order ID: {confirmation.id}</Muted>
              <Muted>
                {confirmation.side === "buy" ? "Bought" : "Sold"}{" "}
                {confirmation.qty} {confirmation.symbol} @{" "}
                {formatMoney(confirmation.filledPrice ?? 0)}
              </Muted>
              <Muted>Status: {confirmation.status}</Muted>
            </Card>
          )}

          <Muted style={styles.footnote}>
            Paper mode only. No real money moves. Limit orders fill at your
            limit price in this mock.
          </Muted>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: theme.bg, flex: 1 },
  flex: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 32 },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: { color: theme.text, fontSize: 24, fontWeight: "800" },
  modeBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  modeBadgePaper: { backgroundColor: "#12331F" },
  modeBadgeLive: { backgroundColor: "#3A1720" },
  modeText: { fontSize: 11, fontWeight: "800" },
  warnCard: { borderColor: theme.red, marginBottom: 12 },
  warnTitle: {
    color: theme.red,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  segmented: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderRadius: theme.radius,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 16,
    overflow: "hidden",
  },
  segment: { alignItems: "center", flex: 1, paddingVertical: 12 },
  segmentActive: { backgroundColor: theme.surface2 },
  segmentText: { color: theme.muted, fontSize: 15, fontWeight: "600" },
  segmentTextActive: { color: theme.text, fontWeight: "700" },
  input: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderRadius: theme.radius,
    borderWidth: 1,
    color: theme.text,
    fontSize: 16,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  previewValue: { color: theme.text, fontSize: 14, fontWeight: "600" },
  error: { color: theme.red, fontSize: 14, marginTop: 12 },
  confirm: { marginTop: 20 },
  confirmCard: { borderColor: theme.green, marginTop: 16 },
  confirmTitle: {
    color: theme.green,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 6,
  },
  footnote: { marginTop: 16, textAlign: "center" },
});
