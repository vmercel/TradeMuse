/**
 * TradingApp backend client.
 *
 * Typed async interface for everything the app needs from the backend.
 * Every method currently routes to the mock layer (USE_MOCK = true).
 *
 * REAL BACKEND PLAN (Supabase edge functions, TODO):
 *   - getAccount      -> GET /account            (Alpaca paper account)
 *   - getPositions     -> GET /positions
 *   - getOrders        -> GET /orders
 *   - getQuotes        -> GET /quotes?symbols=...
 *   - createProposal   -> POST /proposals         (agent writes a proposal)
 *   - listProposals    -> GET /proposals
 *   - approveProposal  -> POST /proposals/:id/approve  (marks approved; the
 *                          backend, not the phone, places the Alpaca order)
 *   - rejectProposal   -> POST /proposals/:id/reject
 *   - placeOrder       -> POST /orders            (manual order ticket;
 *                          backend enforces guardrails + kill switch)
 *
 * SECURITY: never put API keys, secrets, or broker credentials in this file
 * or anywhere in the app bundle. The phone only ever talks to our backend
 * with the user's session token. Alpaca keys live server side only.
 */

import {
  addMockOrder,
  addMockProposal,
  getMockAccount,
  getMockActivity,
  getMockOrders,
  getMockPositions,
  getMockProposals,
  getMockQuotes,
  logMockActivity,
  setMockProposalStatus,
} from "./mockData";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type Mode = "paper" | "live";
export type Side = "buy" | "sell";
export type OrderType = "market" | "limit";
export type OrderStatus = "filled" | "pending" | "cancelled" | "rejected";
export type ProposalStatus = "pending" | "approved" | "rejected" | "executed";

export interface Account {
  equity: number;
  cash: number;
  buyingPower: number;
  dayPnL: number;
  dayPnLPercent: number;
  mode: Mode;
}

export interface Position {
  symbol: string;
  qty: number;
  avgEntryPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  dayChangePercent: number;
}

export interface Order {
  id: string;
  symbol: string;
  qty: number;
  side: Side;
  type: OrderType;
  limitPrice?: number;
  status: OrderStatus;
  filledPrice?: number;
  createdAt: string;
  mode: Mode;
}

export interface OrderInput {
  symbol: string;
  qty: number;
  side: Side;
  type: OrderType;
  limitPrice?: number;
}

export interface Quote {
  symbol: string;
  lastPrice: number;
  dayChange: number;
  dayChangePercent: number;
  volume: number;
}

export interface ProposalInput {
  symbol: string;
  side: Side;
  qty: number;
  orderType: OrderType;
  limitPrice?: number;
  rationale: string;
  confidence: "low" | "medium" | "high";
}

export interface Proposal extends ProposalInput {
  id: string;
  status: ProposalStatus;
  createdAt: string;
  decidedAt?: string;
}

export interface ActivityEntry {
  id: string;
  timestamp: string;
  kind: "order" | "proposal" | "system" | "guardrail";
  message: string;
}

export interface Guardrails {
  maxPositionSize: number; // max dollars per single order
  maxDailyLoss: number; // max dollars of realized day loss before blocking
  killSwitch: boolean; // when true, all order placement is blocked
}

/* ------------------------------------------------------------------ */
/* Client                                                              */
/* ------------------------------------------------------------------ */

/** Master switch. Keep true until the Supabase backend is live. */
export const USE_MOCK = true;

/** Base URL of the backend, configured in Settings. Unused while mocking. */
export let BACKEND_URL = "";

export function setBackendUrl(url: string): void {
  BACKEND_URL = url.trim().replace(/\/+$/, "");
}

export interface TradingClient {
  getAccount(mode: Mode): Promise<Account>;
  getPositions(mode: Mode): Promise<Position[]>;
  getOrders(mode: Mode): Promise<Order[]>;
  getQuotes(symbols: string[]): Promise<Quote[]>;
  createProposal(input: ProposalInput): Promise<Proposal>;
  listProposals(): Promise<Proposal[]>;
  approveProposal(id: string, mode: Mode): Promise<Proposal>;
  rejectProposal(id: string): Promise<Proposal>;
  placeOrder(input: OrderInput, mode: Mode): Promise<Order>;
  getActivity(): Promise<ActivityEntry[]>;
}

async function latency(): Promise<void> {
  // Simulate network round trip so loading states are real.
  await new Promise((resolve) => setTimeout(resolve, 350));
}

function backendNotWired(method: string): Error {
  // TODO: replace with fetch(`${BACKEND_URL}/functions/v1/<fn>`, {...})
  // using the user's session token. Keep Alpaca keys server side only.
  return new Error(
    `Backend not wired: ${method} has no live implementation yet.`
  );
}

export const api: TradingClient = {
  async getAccount(mode: Mode): Promise<Account> {
    if (USE_MOCK) {
      await latency();
      return { ...getMockAccount(), mode };
    }
    throw backendNotWired("getAccount");
  },

  async getPositions(mode: Mode): Promise<Position[]> {
    if (USE_MOCK) {
      await latency();
      void mode;
      return getMockPositions();
    }
    throw backendNotWired("getPositions");
  },

  async getOrders(mode: Mode): Promise<Order[]> {
    if (USE_MOCK) {
      await latency();
      return getMockOrders().filter((o) => o.mode === mode);
    }
    throw backendNotWired("getOrders");
  },

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    if (USE_MOCK) {
      await latency();
      return getMockQuotes(symbols);
    }
    throw backendNotWired("getQuotes");
  },

  async createProposal(input: ProposalInput): Promise<Proposal> {
    if (USE_MOCK) {
      await latency();
      const proposal = addMockProposal(input);
      logMockActivity(
        "proposal",
        `Muse proposed: ${input.side === "buy" ? "Buy" : "Sell"} ${input.qty} ${input.symbol} (${input.orderType}).`
      );
      return proposal;
    }
    throw backendNotWired("createProposal");
  },

  async listProposals(): Promise<Proposal[]> {
    if (USE_MOCK) {
      await latency();
      return getMockProposals();
    }
    throw backendNotWired("listProposals");
  },

  async approveProposal(id: string, mode: Mode): Promise<Proposal> {
    if (USE_MOCK) {
      await latency();
      if (mode === "live") {
        // Live execution must go through the backend, which is not wired.
        // Mark approved only; the backend will place the Alpaca order later.
        const approved = setMockProposalStatus(id, "approved");
        if (!approved) throw new Error(`Proposal ${id} not found.`);
        logMockActivity(
          "proposal",
          `Proposal ${id} approved. Live execution requires the backend (not yet wired).`
        );
        return approved;
      }
      const approved = setMockProposalStatus(id, "executed");
      if (!approved) throw new Error(`Proposal ${id} not found.`);
      const filled = addMockOrder({
        symbol: approved.symbol,
        qty: approved.qty,
        side: approved.side,
        type: approved.orderType,
        limitPrice: approved.limitPrice,
        status: "filled",
        filledPrice:
          approved.orderType === "limit" && approved.limitPrice
            ? approved.limitPrice
            : getMockQuotes([approved.symbol])[0]?.lastPrice ?? 0,
        mode: "paper",
      });
      logMockActivity(
        "order",
        `Approved proposal ${id}. ${approved.side === "buy" ? "Bought" : "Sold"} ${approved.qty} ${approved.symbol} @ ${filled.filledPrice?.toFixed(2)} (paper).`
      );
      return approved;
    }
    throw backendNotWired("approveProposal");
  },

  async rejectProposal(id: string): Promise<Proposal> {
    if (USE_MOCK) {
      await latency();
      const rejected = setMockProposalStatus(id, "rejected");
      if (!rejected) throw new Error(`Proposal ${id} not found.`);
      logMockActivity("proposal", `Proposal ${id} rejected. No order placed.`);
      return rejected;
    }
    throw backendNotWired("rejectProposal");
  },

  async placeOrder(input: OrderInput, mode: Mode): Promise<Order> {
    if (USE_MOCK) {
      await latency();
      if (mode === "live") {
        throw new Error(
          "Live trading is disabled. The backend must enable it first."
        );
      }
      const quote = getMockQuotes([input.symbol])[0];
      const filledPrice =
        input.type === "limit" && input.limitPrice
          ? input.limitPrice
          : quote?.lastPrice ?? 0;
      const order = addMockOrder({ ...input, status: "filled", filledPrice, mode });
      logMockActivity(
        "order",
        `${input.side === "buy" ? "Bought" : "Sold"} ${input.qty} ${input.symbol.toUpperCase()} @ ${filledPrice.toFixed(2)} (paper).`
      );
      return order;
    }
    throw backendNotWired("placeOrder");
  },

  async getActivity(): Promise<ActivityEntry[]> {
    if (USE_MOCK) {
      await latency();
      return getMockActivity();
    }
    throw backendNotWired("getActivity");
  },
};
