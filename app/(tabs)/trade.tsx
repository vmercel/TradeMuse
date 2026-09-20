/**
 * Trade tab: manual order ticket.
 * Paper mode executes through the backend. Live mode is hard gated:
 * the confirm button is inert until the backend enables live trading.
 */

import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, type Order, type OrderType, type Side } from "../../lib/api";
import { useAppState } from "../../lib/store";
import {
  Card,
  Field,
  Muted,
  PrimaryButton,
  SectionTitle,
  SegmentedControl,
  formatMoney,
  moneyText,
  theme,
} from "../../components/ui";

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

  const qtyNum = useMemo(() => parseFloat(qty), [qty]);
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
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
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
                  { color: liveMode ? theme.danger : theme.accent },
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
          <SegmentedControl<Side>
            options={["buy", "sell"]}
            value={side}
            onChange={setSide}
            labels={{ buy: "Buy", sell: "Sell" }}
          />

          <SectionTitle>Symbol</SectionTitle>
          <Field
            value={symbol}
            onChangeText={setSymbol}
            placeholder="e.g. AAPL"
            autoCapitalize="characters"
            autoCorrect={false}
          />

          <SectionTitle>Quantity</SectionTitle>
          <Field
            value={qty}
            onChangeText={setQty}
            placeholder="e.g. 10 (fractional allowed)"
            keyboardType="decimal-pad"
          />

          <SectionTitle>Order type</SectionTitle>
          <SegmentedControl<OrderType>
            options={["market", "limit"]}
            value={orderType}
            onChange={setOrderType}
            labels={{ market: "Market", limit: "Limit" }}
          />

          {orderType === "limit" && (
            <>
              <SectionTitle>Limit price</SectionTitle>
              <Field
                value={limitPrice}
                onChangeText={setLimitPrice}
                placeholder="e.g. 230.00"
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
              <Text style={[styles.previewValue, moneyText]}>
                {estimatedValue > 0 ? formatMoney(estimatedValue) : "Priced at fill"}
              </Text>
            </View>
            <View style={styles.previewRow}>
              <Muted>Position limit</Muted>
              <Text
                style={[
                  styles.previewValue,
                  moneyText,
                  exceedsPositionLimit && { color: theme.danger },
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
              liveMode
                ? "Live trading disabled"
                : killSwitchOn
                  ? "Blocked by kill switch"
                  : `Confirm ${side === "buy" ? "Buy" : "Sell"} ${cleanSymbol || ""}`.trim()
            }
            onPress={onConfirm}
            disabled={confirmDisabled}
            loading={submitting}
            style={styles.confirm}
          />

          {confirmation && (
            <Card style={styles.confirmCard}>
              <Text style={styles.confirmTitle}>Order submitted</Text>
              <Muted>Order ID: {confirmation.id}</Muted>
              <Muted>
                {confirmation.side === "buy" ? "Bought" : "Sold"}{" "}
                {confirmation.qty} {confirmation.symbol}
                {confirmation.filledPrice
                  ? ` @ ${formatMoney(confirmation.filledPrice)}`
                  : ""}
              </Muted>
              <Muted>Status: {confirmation.status}</Muted>
            </Card>
          )}

          <Muted style={styles.footnote}>
            Paper mode only. No real money moves.
          </Muted>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: theme.bg, flex: 1 },
  flex: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 32 },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  title: { color: theme.text, fontSize: 26, fontWeight: "800" },
  modeBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  modeBadgePaper: { backgroundColor: "#0E2E25" },
  modeBadgeLive: { backgroundColor: "#3A1720" },
  modeText: { fontSize: 11, fontWeight: "800" },
  warnCard: { borderColor: theme.danger, marginBottom: 12, marginTop: 8 },
  warnTitle: {
    color: theme.danger,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  previewValue: { color: theme.text, fontSize: 14, fontWeight: "600" },
  error: {
    backgroundColor: "#3A1720",
    borderRadius: theme.radiusSm,
    color: theme.danger,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12,
    padding: 12,
  },
  confirm: { marginTop: 20 },
  confirmCard: { borderColor: theme.accent, marginTop: 16 },
  confirmTitle: {
    color: theme.accent,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 6,
  },
  footnote: { marginTop: 16, textAlign: "center" },
});
