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
  Muted,
  SectionTitle,
  formatDateTime,
  formatMoney,
  theme,
} from "../../components/ui";

const confidenceColor: Record<Proposal["confidence"], string> = {
  high: theme.green,
  medium: theme.amber,
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
  const sideColor = proposal.side === "buy" ? theme.green : theme.red;
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
            style={[styles.action, styles.approve, (!canDecide || busy) && styles.actionDisabled]}
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
          entry.kind === "order" && { backgroundColor: theme.green },
          entry.kind === "proposal" && { backgroundColor: theme.accent },
          entry.kind === "guardrail" && { backgroundColor: theme.red },
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
  const [busyId, setBusyId] = useState<string | null>(null);

  const liveMode = mode === "live";
  const canDecide = !guardrails.killSwitch && !liveMode;

  const load = useCallback(async () => {
    try {
      const [p, a] = await Promise.all([
        api.listProposals(),
        api.getActivity(),
      ]);
      setProposals(p);
      setActivity(a);
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

      <Card style={styles.note}>
        <Text style={styles.noteText}>
          Muse proposes. You decide. Nothing executes without your approval,
          and the kill switch in Settings blocks everything instantly.
        </Text>
      </Card>

      {liveMode && (
        <Card style={styles.warnCard}>
          <Text style={styles.warnTitle}>Live approvals are stubs</Text>
          <Muted>
            Approving in live mode only marks the proposal approved. Actual
            execution requires the backend, which is not wired yet.
          </Muted>
        </Card>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.accent} />
        </View>
      ) : (
        <FlatList
          data={[...pending, ...history]}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <SectionTitle>
              Pending proposals ({pending.length})
            </SectionTitle>
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
            <Muted style={styles.empty}>
              No proposals yet. New ideas from Muse will appear here.
            </Muted>
          }
          ListFooterComponent={
            <>
              <SectionTitle>Activity log</SectionTitle>
              {activity.map((entry) => (
                <ActivityRow key={entry.id} entry={entry} />
              ))}
            </>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: theme.bg, flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 12 },
  title: { color: theme.text, fontSize: 24, fontWeight: "800" },
  note: { margin: 16, marginBottom: 4 },
  noteText: { color: theme.text, fontSize: 14, lineHeight: 20 },
  warnCard: { borderColor: theme.amber, marginHorizontal: 16, marginTop: 12 },
  warnTitle: {
    color: theme.amber,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
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
  actions: { flexDirection: "row", gap: 10, marginTop: 12 },
  action: {
    alignItems: "center",
    borderRadius: 10,
    flex: 1,
    paddingVertical: 12,
  },
  approve: { backgroundColor: "#14532D" },
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
  statusExecuted: { backgroundColor: "#12331F" },
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
  empty: { marginTop: 24, textAlign: "center" },
});
