/**
 * Dashboard tab: portfolio hero card and positions.
 * All data comes from the typed api client (Supabase backend).
 */

import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { api, type Account, type Position } from "../../lib/api";
import { useAppState } from "../../lib/store";
import {
  Card,
  ChangePill,
  EmptyState,
  Muted,
  SectionTitle,
  formatMoney,
  formatPercent,
  moneyText,
  theme,
} from "../../components/ui";

function PositionRow({ position }: { position: Position }) {
  const positive = position.unrealizedPnL >= 0;
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Text style={styles.symbol}>{position.symbol}</Text>
        <Muted>
          {position.qty} sh @ {formatMoney(position.avgEntryPrice)}
        </Muted>
      </View>
      <View style={styles.rowRight}>
        <Text style={[styles.value, moneyText]}>
          {formatMoney(position.marketValue)}
        </Text>
        <Text
          style={[
            styles.pnl,
            moneyText,
            { color: positive ? theme.accent : theme.danger },
          ]}
        >
          {formatMoney(position.unrealizedPnL, true)} (
          {formatPercent(position.unrealizedPnLPercent)})
        </Text>
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const { mode } = useAppState();
  const [account, setAccount] = useState<Account | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [acct, pos] = await Promise.all([
        api.getAccount(mode),
        api.getPositions(mode),
      ]);
      setAccount(acct);
      setPositions(pos);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load portfolio.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [mode]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const dayPositive = (account?.dayPnL ?? 0) >= 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Portfolio</Text>
        <View style={styles.modeBadge}>
          <View style={styles.modeDot} />
          <Text style={styles.modeText}>
            {mode === "paper" ? "PAPER" : "LIVE"}
          </Text>
        </View>
      </View>

      {loading && !account && !error ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.accent} />
        </View>
      ) : error && !account ? (
        <View style={styles.centerPad}>
          <EmptyState
            icon="cloud-offline-outline"
            title="Could not load portfolio"
            message={error}
          />
        </View>
      ) : (
        <FlatList
          data={positions}
          keyExtractor={(p) => p.symbol}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.accent}
            />
          }
          ListHeaderComponent={
            <>
              <Card style={styles.hero}>
                <Muted>Total equity</Muted>
                <Text style={[styles.equity, moneyText]}>
                  {formatMoney(account?.equity ?? 0)}
                </Text>
                <View style={styles.statsRow}>
                  <View>
                    <Muted>Buying power</Muted>
                    <Text style={[styles.statValue, moneyText]}>
                      {formatMoney(account?.buyingPower ?? 0)}
                    </Text>
                    <Muted style={styles.cashLine}>
                      Cash {formatMoney(account?.cash ?? 0)}
                    </Muted>
                  </View>
                  <View style={styles.dayPnl}>
                    <Muted>Day P&amp;L</Muted>
                    <Text
                      style={[
                        styles.statValue,
                        moneyText,
                        { color: dayPositive ? theme.accent : theme.danger },
                      ]}
                    >
                      {formatMoney(account?.dayPnL ?? 0, true)}
                    </Text>
                    <ChangePill value={account?.dayPnLPercent ?? 0} />
                  </View>
                </View>
              </Card>
              <SectionTitle>Positions ({positions.length})</SectionTitle>
            </>
          }
          renderItem={({ item }) => (
            <Card style={styles.positionCard}>
              <PositionRow position={item} />
            </Card>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="briefcase-outline"
              title="No open positions"
              message="Approved trades will show up here."
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: theme.bg, flex: 1 },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  title: { color: theme.text, fontSize: 26, fontWeight: "800" },
  modeBadge: {
    alignItems: "center",
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  modeDot: {
    backgroundColor: theme.accent,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  modeText: { color: theme.text, fontSize: 11, fontWeight: "800" },
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  centerPad: { flex: 1, paddingHorizontal: 24 },
  list: { padding: 16, paddingTop: 4 },
  hero: { borderColor: theme.border, padding: 20 },
  equity: {
    color: theme.text,
    fontSize: 38,
    fontWeight: "800",
    marginVertical: 6,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },
  statValue: { color: theme.text, fontSize: 17, fontWeight: "700", marginTop: 2 },
  cashLine: { marginTop: 4 },
  dayPnl: { alignItems: "flex-end", gap: 5 },
  positionCard: { marginBottom: 10, paddingVertical: 14 },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  rowLeft: { gap: 3 },
  rowRight: { alignItems: "flex-end", gap: 3 },
  symbol: { color: theme.text, fontSize: 17, fontWeight: "800" },
  value: { color: theme.text, fontSize: 16, fontWeight: "700" },
  pnl: { fontSize: 13, fontWeight: "600" },
});
