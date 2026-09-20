/**
 * Muse tab: the AI agent's trade proposals.
 * Flow: Muse proposes -> you approve or reject in the app -> the backend
 * places the order via Alpaca. Nothing executes without your approval.
 */

import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { api, type ActivityEntry, type Proposal } from "../../lib/api";
import { useAppState } from "../../lib/store";
import {
  Card,
  EmptyState,
  Muted,
  SectionTitle,
  formatDateTime,
  formatMoney,
  theme,
} from "../../components/ui";

const confidenceColor: Record<Proposal["confidence"], string> = {
  high: theme.accent,
  medium: theme.warn,
  low: theme.muted,
};

function ProposalCard({
  proposal,
  onApprove,
  onReject,
  busy,
  canDecide,
}: {
  proposal: Proposal;
  onApprove: () => void;
  onReject: () => void;
  busy: boolean;
  canDecide: boolean;
}) {
  const pending = proposal.status === "pending";
  const sideColor = proposal.side === "buy" ? theme.accent : theme.danger;
  return (
    <Card style={styles.proposalCard}>
      <View style={styles.proposalHeader}>
        <Text style={[styles.side, { color: sideColor }]}>
          {proposal.side === "buy" ? "BUY" : "SELL"} {proposal.qty}{" "}
          {proposal.symbol}
        </Text>
        <Text
          style={[
            styles.confidence,
            { color: confidenceColor[proposal.confidence] },
          ]}
        >
          {proposal.confidence.toUpperCase()}
        </Text>
      </View>
      <Muted style={styles.rationale}>{proposal.rationale}</Muted>
      <View style={styles.proposalMeta}>
        <Muted>
          {proposal.orderType === "limit" && proposal.limitPrice
            ? `Limit @ ${formatMoney(proposal.limitPrice)}`
            : "Market order"}
        </Muted>
        <Muted>{formatDateTime(proposal.createdAt)}</Muted>
      </View>
      {pending ? (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.action, styles.reject]}
            onPress={onReject}
            disabled={busy || !canDecide}
          >
            <Text style={styles.actionText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.action,
              styles.approve,
              (!canDecide || busy) && styles.actionDisabled,
            ]}
            onPress={onApprove}
            disabled={busy || !canDecide}
          >
            <Text style={styles.actionText}>
              {busy ? "Working..." : "Approve"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View
          style={[
            styles.statusBadge,
            proposal.status === "executed" && styles.statusExecuted,
            proposal.status === "rejected" && styles.statusRejected,
            proposal.status === "approved" && styles.statusApproved,
          ]}
        >
          <Text style={styles.statusText}>{proposal.status.toUpperCase()}</Text>
        </View>
      )}
    </Card>
  );
}

function ActivityRow({ entry }: { entry: ActivityEntry }) {
  return (
    <View style={styles.activityRow}>
      <View
        style={[
          styles.dot,
          entry.kind === "order" && { backgroundColor: theme.accent },
          entry.kind === "proposal" && { backgroundColor: theme.warn },
          entry.kind === "guardrail" && { backgroundColor: theme.danger },
          entry.kind === "system" && { backgroundColor: theme.muted },
        ]}
      />
      <View style={styles.activityText}>
        <Text style={styles.activityMessage}>{entry.message}</Text>
        <Muted>{formatDateTime(entry.timestamp)}</Muted>
      </View>
    </View>
  );
}

export default function MuseScreen() {
  const { mode, guardrails } = useAppState();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const liveMode = mode === "live";
  const canDecide = !guardrails.killSwitch && !liveMode;

  const load = useCallback(async () => {
    try {
      setError(null);
      const [p, a] = await Promise.all([
        api.listProposals(),
        api.getActivity().catch(() => [] as ActivityEntry[]),
      ]);
      setProposals(p);
      setActivity(a);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load proposals.");
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

  const decide = async (id: string, approve: boolean) => {
    setBusyId(id);
    try {
      if (approve) await api.approveProposal(id, mode);
      else await api.rejectProposal(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Decision failed.");
    } finally {
      setBusyId(null);
    }
  };

  const pending = proposals.filter((p) => p.status === "pending");
  const history = proposals.filter((p) => p.status !== "pending");

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Muse</Text>
        <Muted>AI trade proposals</Muted>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.accent} />
        </View>
      ) : error && proposals.length === 0 ? (
        <View style={styles.centerPad}>
          <EmptyState
            icon="cloud-offline-outline"
            title="Could not load proposals"
            message={error}
          />
        </View>
      ) : (
        <FlatList
          data={[...pending, ...history]}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <>
              <Card style={styles.note}>
                <Text style={styles.noteText}>
                  Muse proposes. You decide. Nothing executes without your
                  approval, and the kill switch in Settings blocks everything
                  instantly.
                </Text>
              </Card>
              {error ? <Text style={styles.inlineError}>{error}</Text> : null}
              <SectionTitle>Pending proposals ({pending.length})</SectionTitle>
            </>
          }
          renderItem={({ item }) => (
            <ProposalCard
              proposal={item}
              busy={busyId === item.id}
              canDecide={canDecide}
              onApprove={() => decide(item.id, true)}
              onReject={() => decide(item.id, false)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="sparkles-outline"
              title="No proposals yet"
              message="New ideas from Muse will appear here."
            />
          }
          ListFooterComponent={
            activity.length > 0 ? (
              <>
                <SectionTitle>Activity log</SectionTitle>
                {activity.map((entry) => (
                  <ActivityRow key={entry.id} entry={entry} />
                ))}
              </>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: theme.bg, flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 12 },
  title: { color: theme.text, fontSize: 26, fontWeight: "800" },
  note: { marginBottom: 4, marginTop: 12 },
  noteText: { color: theme.text, fontSize: 14, lineHeight: 20 },
  inlineError: {
    backgroundColor: "#3A1720",
    borderRadius: theme.radiusSm,
    color: theme.danger,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 12,
    padding: 10,
  },
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  centerPad: { flex: 1, paddingHorizontal: 24 },
  list: { padding: 16, paddingTop: 8 },
  proposalCard: { marginBottom: 12 },
  proposalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  side: { fontSize: 17, fontWeight: "800" },
  confidence: { fontSize: 12, fontWeight: "800" },
  rationale: { lineHeight: 20, marginTop: 8 },
  proposalMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  actions: { flexDirection: "row", gap: 10, marginTop: 14 },
  action: {
    alignItems: "center",
    borderRadius: theme.radiusSm,
    flex: 1,
    paddingVertical: 13,
  },
  approve: { backgroundColor: "#0E5C44" },
  reject: { backgroundColor: "#3A1720" },
  actionDisabled: { opacity: 0.4 },
  actionText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  statusBadge: {
    alignSelf: "flex-start",
    borderRadius: 8,
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusExecuted: { backgroundColor: "#0E2E25" },
  statusRejected: { backgroundColor: "#3A1720" },
  statusApproved: { backgroundColor: "#3A2E12" },
  statusText: { color: theme.text, fontSize: 11, fontWeight: "800" },
  activityRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    paddingVertical: 8,
  },
  dot: {
    borderRadius: 5,
    height: 10,
    marginTop: 4,
    width: 10,
  },
  activityText: { flex: 1, gap: 2 },
  activityMessage: { color: theme.text, fontSize: 14, lineHeight: 20 },
});
