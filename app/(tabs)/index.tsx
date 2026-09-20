/**
 * Dashboard tab: portfolio snapshot and positions.
 * All data comes from the typed api client (mock layer for now).
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
  Muted,
  SectionTitle,
  formatMoney,
  formatPercent,
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
        <Text style={styles.value}>{formatMoney(position.marketValue)}</Text>
        <Text style={[styles.pnl, { color: positive ? theme.green : theme.red }]}>
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

  const load = useCallback(async () => {
    try {
      const [acct, pos] = await Promise.all([
        api.getAccount(mode),
        api.getPositions(mode),
      ]);
      setAccount(acct);
      setPositions(pos);
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
          <Text style={styles.modeText}>
            {mode === "paper" ? "PAPER TRADING" : "LIVE"}
          </Text>
        </View>
      </View>

      {loading && !account ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.accent} />
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
              <Card>
                <Muted>Total equity</Muted>
                <Text style={styles.equity}>
                  {formatMoney(account?.equity ?? 0)}
                </Text>
                <View style={styles.statsRow}>
                  <View>
                    <Muted>Buying power</Muted>
                    <Text style={styles.statValue}>
                      {formatMoney(account?.buyingPower ?? 0)}
                    </Text>
                  </View>
                  <View style={styles.dayPnl}>
                    <Muted>Day P&amp;L</Muted>
                    <Text
                      style={[
                        styles.statValue,
                        { color: dayPositive ? theme.green : theme.red },
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
            <Muted style={styles.empty}>No open positions.</Muted>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { color: theme.text, fontSize: 24, fontWeight: "800" },
  modeBadge: {
    backgroundColor: "#12331F",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  modeText: { color: theme.green, fontSize: 11, fontWeight: "800" },
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  list: { padding: 16, paddingTop: 4 },
  equity: {
    color: theme.text,
    fontSize: 34,
    fontWeight: "800",
    marginVertical: 6,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  statValue: { color: theme.text, fontSize: 16, fontWeight: "700", marginTop: 2 },
  dayPnl: { alignItems: "flex-end", gap: 4 },
  positionCard: { marginBottom: 10, paddingVertical: 12 },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  rowLeft: { gap: 2 },
  rowRight: { alignItems: "flex-end", gap: 2 },
  symbol: { color: theme.text, fontSize: 16, fontWeight: "800" },
  value: { color: theme.text, fontSize: 15, fontWeight: "700" },
  pnl: { fontSize: 13, fontWeight: "600" },
  empty: { marginTop: 24, textAlign: "center" },
});
