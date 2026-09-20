/**
 * Markets tab: watchlist with bid/ask quotes, plus symbol search/add.
 * Quotes come from the backend; the watchlist is kept locally.
 */

import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, type Quote } from "../../lib/api";
import { knownSymbols } from "../../lib/mockData";
import {
  Card,
  EmptyState,
  Muted,
  SectionTitle,
  formatMoney,
  moneyText,
  theme,
} from "../../components/ui";

const DEFAULT_WATCHLIST = ["AAPL", "NVDA", "MSFT", "TSLA", "SPY"];

function QuoteRow({
  quote,
  onRemove,
}: {
  quote: Quote;
  onRemove: () => void;
}) {
  const bid = quote.bid ?? quote.lastPrice;
  const ask = quote.ask ?? quote.lastPrice;
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Text style={styles.symbol}>{quote.symbol}</Text>
        <Muted>
          Bid {formatMoney(bid)} / Ask {formatMoney(ask)}
        </Muted>
      </View>
      <View style={styles.rowRight}>
        <Text style={[styles.price, moneyText]}>{formatMoney(ask)}</Text>
        <TouchableOpacity onPress={onRemove} hitSlop={10}>
          <Ionicons name="remove-circle-outline" size={20} color={theme.muted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function MarketsScreen() {
  const [watchlist, setWatchlist] = useState<string[]>(DEFAULT_WATCHLIST);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    try {
      setError(null);
      const next = await api.getQuotes(watchlist);
      setQuotes(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load quotes.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [watchlist]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const results = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (q.length === 0) return [];
    return knownSymbols
      .filter(
        (s) => s.symbol.includes(q) || s.name.toUpperCase().includes(q)
      )
      .filter((s) => !watchlist.includes(s.symbol))
      .slice(0, 6);
  }, [query, watchlist]);

  const addSymbol = (symbol: string) => {
    setWatchlist((w) => (w.includes(symbol) ? w : [...w, symbol]));
    setQuery("");
  };

  const removeSymbol = (symbol: string) => {
    setWatchlist((w) => w.filter((s) => s !== symbol));
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Markets</Text>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={theme.muted} />
        <TextInput
          style={styles.search}
          placeholder="Search symbols, e.g. COIN"
          placeholderTextColor={theme.muted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery("")}>
            <Ionicons name="close-circle" size={18} color={theme.muted} />
          </TouchableOpacity>
        )}
      </View>

      {results.length > 0 && (
        <View style={styles.results}>
          {results.map((r) => (
            <TouchableOpacity
              key={r.symbol}
              style={styles.resultRow}
              onPress={() => addSymbol(r.symbol)}
            >
              <View>
                <Text style={styles.symbol}>{r.symbol}</Text>
                <Muted>{r.name}</Muted>
              </View>
              <Ionicons name="add-circle-outline" size={24} color={theme.accent} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.accent} />
        </View>
      ) : error && quotes.length === 0 ? (
        <View style={styles.centerPad}>
          <EmptyState
            icon="cloud-offline-outline"
            title="Could not load quotes"
            message={error}
          />
        </View>
      ) : (
        <FlatList
          data={quotes}
          keyExtractor={(q) => q.symbol}
          contentContainerStyle={styles.list}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          refreshing={refreshing}
          ListHeaderComponent={<SectionTitle>Watchlist</SectionTitle>}
          renderItem={({ item }) => (
            <Card style={styles.quoteCard}>
              <QuoteRow quote={item} onRemove={() => removeSymbol(item.symbol)} />
            </Card>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="stats-chart-outline"
              title="Watchlist is empty"
              message="Search above to add symbols."
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: theme.bg, flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 12 },
  title: { color: theme.text, fontSize: 26, fontWeight: "800" },
  searchWrap: {
    alignItems: "center",
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderRadius: theme.radius,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  search: { color: theme.text, flex: 1, fontSize: 15 },
  results: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderRadius: theme.radius,
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 8,
    overflow: "hidden",
  },
  resultRow: {
    alignItems: "center",
    borderBottomColor: theme.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
  },
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  centerPad: { flex: 1, paddingHorizontal: 24 },
  list: { padding: 16, paddingTop: 8 },
  quoteCard: { marginBottom: 10, paddingVertical: 14 },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  rowLeft: { gap: 3 },
  rowRight: { alignItems: "center", flexDirection: "row", gap: 12 },
  symbol: { color: theme.text, fontSize: 17, fontWeight: "800" },
  price: { color: theme.text, fontSize: 16, fontWeight: "700" },
});
