/**
 * Mock data layer for TradingApp.
 *
 * Everything in this file is MOCK data for UI development. No real broker
 * connection, no real money. When the backend is ready, lib/api.ts will
 * replace these in-memory stores with Supabase edge-function calls.
 */

import type {
  Account,
  ActivityEntry,
  Guardrails,
  Order,
  Position,
  Proposal,
  Quote,
} from "./api";

/* ------------------------------------------------------------------ */
/* Account                                                             */
/* ------------------------------------------------------------------ */

export const mockAccount: Account = {
  equity: 128450.22,
  cash: 34210.55,
  buyingPower: 68421.1,
  dayPnL: 1247.86,
  dayPnLPercent: 0.98,
  mode: "paper",
};

export function getMockAccount(): Account {
  return { ...mockAccount };
}

/* ------------------------------------------------------------------ */
/* Positions                                                           */
/* ------------------------------------------------------------------ */

const seedPositions: Position[] = [
  {
    symbol: "AAPL",
    qty: 40,
    avgEntryPrice: 214.32,
    currentPrice: 228.14,
    marketValue: 9125.6,
    unrealizedPnL: 552.8,
    unrealizedPnLPercent: 6.45,
    dayChangePercent: 1.24,
  },
  {
    symbol: "NVDA",
    qty: 60,
    avgEntryPrice: 118.45,
    currentPrice: 131.27,
    marketValue: 7876.2,
    unrealizedPnL: 769.2,
    unrealizedPnLPercent: 10.82,
    dayChangePercent: 2.86,
  },
  {
    symbol: "MSFT",
    qty: 25,
    avgEntryPrice: 402.1,
    currentPrice: 428.66,
    marketValue: 10716.5,
    unrealizedPnL: 664.0,
    unrealizedPnLPercent: 6.61,
    dayChangePercent: 0.74,
  },
  {
    symbol: "TSLA",
    qty: 30,
    avgEntryPrice: 248.9,
    currentPrice: 241.55,
    marketValue: 7246.5,
    unrealizedPnL: -220.5,
    unrealizedPnLPercent: -2.95,
    dayChangePercent: -1.32,
  },
  {
    symbol: "SPY",
    qty: 50,
    avgEntryPrice: 512.4,
    currentPrice: 521.83,
    marketValue: 26091.5,
    unrealizedPnL: 471.5,
    unrealizedPnLPercent: 1.84,
    dayChangePercent: 0.41,
  },
];

export function getMockPositions(): Position[] {
  return seedPositions.map((p) => ({ ...p }));
}

/* ------------------------------------------------------------------ */
/* Quotes and watchlist                                                */
/* ------------------------------------------------------------------ */

export interface KnownSymbol {
  symbol: string;
  name: string;
}

export const knownSymbols: KnownSymbol[] = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "NVDA", name: "NVIDIA Corporation" },
  { symbol: "MSFT", name: "Microsoft Corporation" },
  { symbol: "TSLA", name: "Tesla, Inc." },
  { symbol: "SPY", name: "SPDR S&P 500 ETF" },
  { symbol: "AMD", name: "Advanced Micro Devices" },
  { symbol: "META", name: "Meta Platforms, Inc." },
  { symbol: "AMZN", name: "Amazon.com, Inc." },
  { symbol: "GOOGL", name: "Alphabet Inc." },
  { symbol: "NFLX", name: "Netflix, Inc." },
  { symbol: "COIN", name: "Coinbase Global, Inc." },
  { symbol: "PLTR", name: "Palantir Technologies" },
];

const seedQuotes: Record<string, Quote> = {
  AAPL: { symbol: "AAPL", lastPrice: 228.14, dayChange: 2.79, dayChangePercent: 1.24, volume: 48210333 },
  NVDA: { symbol: "NVDA", lastPrice: 131.27, dayChange: 3.65, dayChangePercent: 2.86, volume: 214882101 },
  MSFT: { symbol: "MSFT", lastPrice: 428.66, dayChange: 3.15, dayChangePercent: 0.74, volume: 18944207 },
  TSLA: { symbol: "TSLA", lastPrice: 241.55, dayChange: -3.23, dayChangePercent: -1.32, volume: 88120455 },
  SPY: { symbol: "SPY", lastPrice: 521.83, dayChange: 2.13, dayChangePercent: 0.41, volume: 62118344 },
  AMD: { symbol: "AMD", lastPrice: 162.08, dayChange: 3.1, dayChangePercent: 1.95, volume: 44812007 },
  META: { symbol: "META", lastPrice: 585.2, dayChange: 3.6, dayChangePercent: 0.62, volume: 11092881 },
  AMZN: { symbol: "AMZN", lastPrice: 197.44, dayChange: -0.55, dayChangePercent: -0.28, volume: 33910245 },
  GOOGL: { symbol: "GOOGL", lastPrice: 176.32, dayChange: 1.12, dayChangePercent: 0.64, volume: 22104510 },
  NFLX: { symbol: "NFLX", lastPrice: 692.15, dayChange: -4.4, dayChangePercent: -0.63, volume: 2988102 },
  COIN: { symbol: "COIN", lastPrice: 264.9, dayChange: 8.21, dayChangePercent: 3.2, volume: 6120440 },
  PLTR: { symbol: "PLTR", lastPrice: 178.44, dayChange: 2.98, dayChangePercent: 1.7, volume: 44120873 },
};

const watchlist = ["AAPL", "NVDA", "MSFT", "TSLA", "SPY", "AMD", "META"];

export function getMockWatchlist(): string[] {
  return [...watchlist];
}

export function addMockWatchlist(symbol: string): void {
  const upper = symbol.toUpperCase();
  if (!watchlist.includes(upper)) watchlist.push(upper);
}

export function getMockQuotes(symbols: string[]): Quote[] {
  return symbols
    .map((s) => s.toUpperCase())
    .map((s) => seedQuotes[s])
    .filter(Boolean)
    .map((q) => ({ ...q }));
}

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

let orderCounter = 1003;
const orders: Order[] = [
  {
    id: "PAPER-1001",
    symbol: "AAPL",
    qty: 10,
    side: "buy",
    type: "market",
    status: "filled",
    filledPrice: 226.4,
    createdAt: "2026-09-19T14:32:10Z",
    mode: "paper",
  },
  {
    id: "PAPER-1002",
    symbol: "TSLA",
    qty: 5,
    side: "sell",
    type: "limit",
    limitPrice: 252.0,
    status: "filled",
    filledPrice: 252.0,
    createdAt: "2026-09-18T10:05:44Z",
    mode: "paper",
  },
];

export function getMockOrders(): Order[] {
  return orders.map((o) => ({ ...o })).reverse();
}

export function addMockOrder(order: Omit<Order, "id" | "createdAt">): Order {
  const full: Order = {
    ...order,
    id: `PAPER-${orderCounter++}`,
    createdAt: new Date().toISOString(),
  };
  orders.push(full);
  return { ...full };
}

/* ------------------------------------------------------------------ */
/* Proposals (from the Muse agent)                                     */
/* ------------------------------------------------------------------ */

let proposalCounter = 104;
const proposals: Proposal[] = [
  {
    id: "PROP-101",
    symbol: "NVDA",
    side: "buy",
    qty: 10,
    orderType: "market",
    rationale:
      "NVDA broke above its 20 day moving average on rising volume. Momentum continuation setup with the position sized inside your guardrails.",
    confidence: "high",
    status: "pending",
    createdAt: "2026-09-20T13:12:00Z",
  },
  {
    id: "PROP-102",
    symbol: "TSLA",
    side: "sell",
    qty: 15,
    orderType: "limit",
    limitPrice: 245.0,
    rationale:
      "TSLA was rejected near the 248 resistance level twice this week. Proposal takes partial profits and reduces exposure to a losing position.",
    confidence: "medium",
    status: "pending",
    createdAt: "2026-09-20T11:47:00Z",
  },
  {
    id: "PROP-103",
    symbol: "MSFT",
    side: "buy",
    qty: 5,
    orderType: "market",
    rationale:
      "MSFT is consolidating near its highs. Small add to a winning position, well under the max position size.",
    confidence: "low",
    status: "executed",
    createdAt: "2026-09-19T15:20:00Z",
    decidedAt: "2026-09-19T15:41:00Z",
  },
];

export function getMockProposals(): Proposal[] {
  return proposals.map((p) => ({ ...p }));
}

export function addMockProposal(
  proposal: Omit<Proposal, "id" | "createdAt" | "status">
): Proposal {
  const full: Proposal = {
    ...proposal,
    id: `PROP-${proposalCounter++}`,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  proposals.unshift(full);
  return { ...full };
}

export function setMockProposalStatus(
  id: string,
  status: Proposal["status"]
): Proposal | null {
  const found = proposals.find((p) => p.id === id);
  if (!found) return null;
  found.status = status;
  found.decidedAt = new Date().toISOString();
  return { ...found };
}

/* ------------------------------------------------------------------ */
/* Activity log                                                        */
/* ------------------------------------------------------------------ */

let activityCounter = 2004;
const activity: ActivityEntry[] = [
  {
    id: "ACT-2001",
    timestamp: "2026-09-20T13:12:00Z",
    kind: "proposal",
    message: "Muse proposed: Buy 10 NVDA (market).",
  },
  {
    id: "ACT-2002",
    timestamp: "2026-09-20T11:47:00Z",
    kind: "proposal",
    message: "Muse proposed: Sell 15 TSLA (limit 245.00).",
  },
  {
    id: "ACT-2003",
    timestamp: "2026-09-19T15:41:00Z",
    kind: "order",
    message: "Approved proposal PROP-103. Bought 5 MSFT @ 427.90 (paper).",
  },
];

export function getMockActivity(): ActivityEntry[] {
  return activity.map((a) => ({ ...a }));
}

export function logMockActivity(
  kind: ActivityEntry["kind"],
  message: string
): ActivityEntry {
  const entry: ActivityEntry = {
    id: `ACT-${activityCounter++}`,
    timestamp: new Date().toISOString(),
    kind,
    message,
  };
  activity.unshift(entry);
  return { ...entry };
}

/* ------------------------------------------------------------------ */
/* Guardrails                                                          */
/* ------------------------------------------------------------------ */

export const defaultGuardrails: Guardrails = {
  maxPositionSize: 10000,
  maxDailyLoss: 2000,
  killSwitch: false,
};
