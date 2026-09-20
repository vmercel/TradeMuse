/**
 * Markets tab: watchlist with live-style quotes, plus symbol search/add.
 * Mock layer for now; quotes will come from the backend later.
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
import {
  addMockWatchlist,
  getMockWatchlist,
  knownSymbols,
} from "../../lib/mockData";
import {
  Card,
  ChangePill,
  Muted,
  SectionTitle,
  formatMoney,
  theme,
} from "../../components/ui";

function QuoteRow({ quote }: { quote: Quote }) {
  const positive = quote.dayChangePercent >= 0;
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Text style={styles.symbol}>{quote.symbol}</Text>
        <Muted>Vol {(quote.volume / 1_000_000).toFixed(1)}M</Muted>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.price}>{formatMoney(quote.lastPrice)}</Text>
        <ChangePill value={quote.dayChangePercent} />
      </View>
    </View>
  );
}

export default function MarketsScreen() {
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    try {
      const symbols = getMockWatchlist();
      setWatchlist(symbols);
      setQuotes(await api.getQuotes(symbols));
    } finally {
      setLoading(false);
    }
  }, []);

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
        (s) =>
          s.symbol.includes(q) || s.name.toUpperCase().includes(q)
      )
      .filter((s) => !watchlist.includes(s.symbol))
      .slice(0, 6);
  }, [query, watchlist]);

  const addSymbol = (symbol: string) => {
    addMockWatchlist(symbol);
    setQuery("");
    load();
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
      ) : (
        <FlatList
          data={quotes}
          keyExtractor={(q) => q.symbol}
          contentContainerStyle={styles.list}
          ListHeaderComponent={<SectionTitle>Watchlist</SectionTitle>}
          renderItem={({ item }) => (
            <Card style={styles.quoteCard}>
              <QuoteRow quote={item} />
            </Card>
          )}
          ListEmptyComponent={
            <Muted style={styles.empty}>
              Your watchlist is empty. Search above to add symbols.
            </Muted>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: theme.bg, flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  title: { color: theme.text, fontSize: 24, fontWeight: "800" },
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
  list: { padding: 16, paddingTop: 8 },
  quoteCard: { marginBottom: 10, paddingVertical: 12 },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  rowLeft: { gap: 2 },
  rowRight: { alignItems: "flex-end", gap: 6 },
  symbol: { color: theme.text, fontSize: 16, fontWeight: "800" },
  price: { color: theme.text, fontSize: 15, fontWeight: "700" },
  empty: { marginTop: 24, textAlign: "center" },
});
