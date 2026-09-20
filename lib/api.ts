/**
 * TradeMuse backend client.
 *
 * Typed async interface for everything the app needs from the backend.
 * Every method routes to the mock layer while USE_MOCK = true.
 *
 * LIVE BACKEND (Supabase edge function trademuse-api):
 *   POST {BACKEND_URL} with header x-trademuse-key and JSON {action, ...}
 *   - getAccount      -> {action:"account"}            (Alpaca paper account)
 *   - getPositions    -> {action:"positions"}
 *   - getOrders       -> {action:"orders"}
 *   - getQuotes       -> {action:"quotes", symbols:[]}
 *   - createProposal  -> {action:"proposal_create", ...} (agent writes proposal)
 *   - listProposals   -> {action:"proposal_list"}
 *   - approveProposal -> {action:"proposal_approve", id} (backend places order)
 *   - rejectProposal  -> {action:"proposal_reject", id}
 *   - placeOrder      -> {action:"order_place", ...}    (manual ticket;
 *                          backend enforces guardrails + kill switch)
 *
 * SECURITY: never put API keys, secrets, or broker credentials in this file
 * or anywhere in the app bundle. The phone only ever talks to our backend
 * with the x-trademuse-key from Settings. Alpaca keys live server side only.
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
import { getAccessToken, supabase } from "./supabase";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type Mode = "paper" | "live";
export type Side = "buy" | "sell";
export type OrderType = "market" | "limit";
export type OrderStatus = "filled" | "pending" | "cancelled" | "rejected";
export type ProposalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "executed"
  | "failed";

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
  bid?: number;
  ask?: number;
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

export interface Profile {
  name: string;
  email: string;
  phone: string;
  addressStreet: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
}

/* ------------------------------------------------------------------ */
/* Client                                                              */
/* ------------------------------------------------------------------ */

/** Master switch. Real Supabase backend is live; mock stays as fallback. */
export const USE_MOCK = false;

/** Default backend URL, prefilled in Settings. The API key is never hardcoded. */
export const DEFAULT_BACKEND_URL =
  "https://kprkjndaomrecoxwxkvi.supabase.co/functions/v1/trademuse-api";

/** Base URL of the backend, configured in Settings. */
export let BACKEND_URL = DEFAULT_BACKEND_URL;

/** Backend API key (x-trademuse-key), configured in Settings. Never hardcoded. */
export let BACKEND_KEY = "";

export function setBackendUrl(url: string): void {
  BACKEND_URL = url.trim().replace(/\/+$/, "");
}

export function setBackendKey(key: string): void {
  BACKEND_KEY = key.trim();
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
  getProfile(): Promise<Profile>;
  updateProfile(patch: Partial<Profile>): Promise<Profile>;
}

/* ------------------------------------------------------------------ */
/* Auth (Supabase Auth, sessions persisted in SecureStore)              */
/* ------------------------------------------------------------------ */

export interface SignupInput {
  name: string;
  email: string;
  phone: string;
  password: string;
  addressStreet: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
}

function friendlyAuthError(message: string): string {
  if (/email not confirmed/i.test(message))
    return "Please verify your email with the 6-digit code we sent you.";
  if (/invalid login credentials/i.test(message))
    return "Incorrect email or password. Try again.";
  if (/user already registered/i.test(message))
    return "An account with this email already exists. Try logging in.";
  if (/password.*weak|weak.*password/i.test(message))
    return "That password is too weak. Use at least 8 characters.";
  if (/otp.*expired|expired.*otp|token.*expired/i.test(message))
    return "That code has expired. Request a new one.";
  if (/invalid.*token|token.*invalid/i.test(message))
    return "That code is not correct. Check and try again.";
  return message;
}

/** Create the account. With email confirmation on, no session is returned;
 * the user must verify the 6-digit OTP next. */
export async function signUp(input: SignupInput): Promise<void> {
  const { error } = await supabase.auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: {
      data: {
        name: input.name.trim(),
        phone: input.phone.trim(),
        address_street: input.addressStreet.trim(),
        address_city: input.addressCity.trim(),
        address_state: input.addressState.trim().toUpperCase(),
        address_zip: input.addressZip.trim(),
      },
    },
  });
  if (error) throw new Error(friendlyAuthError(error.message));
}

/** Confirm the signup email with the 6-digit code. Creates the session. */
export async function verifyOtp(email: string, code: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: code.trim(),
    type: "signup",
  });
  if (error) throw new Error(friendlyAuthError(error.message));
}

/** Resend the signup confirmation code (60s cooldown enforced in UI). */
export async function resendOtp(email: string): Promise<void> {
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: email.trim().toLowerCase(),
  });
  if (error) throw new Error(friendlyAuthError(error.message));
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw new Error(friendlyAuthError(error.message));
}

/** Sign out and clear the persisted session. */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(friendlyAuthError(error.message));
}

/** The currently signed-in user, or null. */
export async function getSessionUser(): Promise<{
  id: string;
  email?: string;
} | null> {
  const { data } = await supabase.auth.getSession();
  const u = data.session?.user;
  return u ? { id: u.id, email: u.email ?? undefined } : null;
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

let mockProfile: Profile = {
  name: "Demo Trader",
  email: "demo@trademuse.app",
  phone: "",
  addressStreet: "",
  addressCity: "",
  addressState: "",
  addressZip: "",
};

const mockApi: TradingClient = {
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

  async getProfile(): Promise<Profile> {
    await latency();
    return { ...mockProfile };
  },

  async updateProfile(patch: Partial<Profile>): Promise<Profile> {
    await latency();
    mockProfile = { ...mockProfile, ...patch };
    return { ...mockProfile };
  },
};

/* ------------------------------------------------------------------ */
/* Live backend: Supabase edge function trademuse-api                   */
/* ------------------------------------------------------------------ */

function confidenceToLabel(n: number): "low" | "medium" | "high" {
  if (n <= 33) return "low";
  if (n <= 66) return "medium";
  return "high";
}

function mapProposal(p: any): Proposal {
  return {
    id: String(p.id),
    symbol: String(p.symbol),
    side: p.side,
    qty: Number(p.qty),
    orderType: p.order_type,
    limitPrice: p.limit_price != null ? Number(p.limit_price) : undefined,
    rationale: String(p.rationale || ""),
    confidence: confidenceToLabel(Number(p.confidence ?? 50)),
    status: p.status,
    createdAt: String(p.created_at),
    decidedAt: p.decided_at ? String(p.decided_at) : undefined,
  };
}

function mapAlpacaOrder(o: any, mode: Mode): Order {
  const raw = String(o.status || "pending").toLowerCase();
  const status: OrderStatus =
    raw === "filled" ? "filled" : raw === "canceled" || raw === "cancelled" ? "cancelled" : raw === "rejected" || raw === "expired" ? "rejected" : "pending";
  return {
    id: String(o.id),
    symbol: String(o.symbol),
    qty: Number(o.qty),
    side: o.side,
    type: o.order_type === "limit" ? "limit" : "market",
    limitPrice: o.limit_price != null ? Number(o.limit_price) : undefined,
    status,
    filledPrice: o.filled_avg_price != null ? Number(o.filled_avg_price) : undefined,
    createdAt: String(o.created_at),
    mode,
  };
}

class SupabaseBackend implements TradingClient {
  private async call<T>(action: string, params: Record<string, unknown> = {}): Promise<T> {
    if (!BACKEND_URL) throw new Error("Backend URL is not set. Add it in Settings.");
    if (!BACKEND_KEY) throw new Error("Backend API key is not set. Add it in Settings.");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-trademuse-key": BACKEND_KEY,
    };
    // After login, scope backend data to the signed-in user.
    const token = await getAccessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(BACKEND_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ action, ...params }),
    });
    let data: any = null;
    try {
      data = await res.json();
    } catch {
      throw new Error(`Backend returned HTTP ${res.status} with no JSON body.`);
    }
    if (!res.ok) throw new Error(data && data.message ? data.message : `Backend error ${res.status}.`);
    return data as T;
  }

  async getAccount(mode: Mode): Promise<Account> {
    const { account } = await this.call<{ account: any }>("account");
    const equity = Number(account.equity);
    const dayPnL = equity - Number(account.last_equity);
    return {
      equity,
      cash: Number(account.cash),
      buyingPower: Number(account.buying_power),
      dayPnL,
      dayPnLPercent: Number(account.last_equity) ? (dayPnL / Number(account.last_equity)) * 100 : 0,
      mode,
    };
  }

  async getPositions(_mode: Mode): Promise<Position[]> {
    const { positions } = await this.call<{ positions: any[] }>("positions");
    return (positions || []).map((p) => ({
      symbol: String(p.symbol),
      qty: Number(p.qty),
      avgEntryPrice: Number(p.avg_entry_price),
      currentPrice: Number(p.current_price),
      marketValue: Number(p.market_value),
      unrealizedPnL: Number(p.unrealized_pl),
      unrealizedPnLPercent: Number(p.unrealized_plpc) * 100,
      dayChangePercent: Number(p.change_today || 0) * 100,
    }));
  }

  async getOrders(mode: Mode): Promise<Order[]> {
    const { orders } = await this.call<{ orders: any[] }>("orders");
    return (orders || []).map((o) => mapAlpacaOrder(o, mode));
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    const { quotes } = await this.call<{ quotes: Record<string, any> }>("quotes", { symbols });
    return symbols.map((s) => {
      const q = quotes && quotes[s.toUpperCase()];
      const bid = q && q.bid != null ? Number(q.bid) : undefined;
      const ask = q && q.ask != null ? Number(q.ask) : undefined;
      const last = ask ?? bid ?? 0;
      return {
        symbol: s.toUpperCase(),
        lastPrice: last,
        bid,
        ask,
        dayChange: 0,
        dayChangePercent: 0,
        volume: 0,
      };
    });
  }

  async createProposal(input: ProposalInput): Promise<Proposal> {
    const confidence = input.confidence === "low" ? 25 : input.confidence === "high" ? 75 : 50;
    const { proposal } = await this.call<{ proposal: any }>("proposal_create", {
      symbol: input.symbol,
      side: input.side,
      qty: input.qty,
      order_type: input.orderType,
      limit_price: input.limitPrice,
      rationale: input.rationale,
      confidence,
    });
    return mapProposal(proposal);
  }

  async listProposals(): Promise<Proposal[]> {
    const { proposals } = await this.call<{ proposals: any[] }>("proposal_list");
    return (proposals || []).map(mapProposal);
  }

  async approveProposal(id: string, _mode: Mode): Promise<Proposal> {
    const res = await this.call<{ proposal: any; result: string; message?: string }>("proposal_approve", { id });
    if (res.result !== "executed") {
      throw new Error(res.message || `Proposal was not executed (result: ${res.result}).`);
    }
    return mapProposal(res.proposal);
  }

  async rejectProposal(id: string): Promise<Proposal> {
    const { proposal } = await this.call<{ proposal: any }>("proposal_reject", { id });
    return mapProposal(proposal);
  }

  async placeOrder(input: OrderInput, mode: Mode): Promise<Order> {
    const { order } = await this.call<{ order: any }>("order_place", {
      symbol: input.symbol,
      side: input.side,
      qty: input.qty,
      order_type: input.type,
      limit_price: input.limitPrice,
    });
    return mapAlpacaOrder(order, mode);
  }

  async getActivity(): Promise<ActivityEntry[]> {
    throw new Error("Activity feed is not available from the backend yet.");
  }

  async getProfile(): Promise<Profile> {
    const { profile } = await this.call<{ profile: any }>("profile_get");
    return mapProfile(profile);
  }

  async updateProfile(patch: Partial<Profile>): Promise<Profile> {
    const { profile } = await this.call<{ profile: any }>("profile_update", {
      name: patch.name,
      phone: patch.phone,
      address_street: patch.addressStreet,
      address_city: patch.addressCity,
      address_state: patch.addressState,
      address_zip: patch.addressZip,
    });
    return mapProfile(profile);
  }
}

function mapProfile(p: any): Profile {
  const s = (v: unknown) => (v == null ? "" : String(v));
  return {
    name: s(p?.name),
    email: s(p?.email),
    phone: s(p?.phone),
    addressStreet: s(p?.address_street),
    addressCity: s(p?.address_city),
    addressState: s(p?.address_state),
    addressZip: s(p?.address_zip),
  };
}

/**
 * The client the screens use. Mock while USE_MOCK is true;
 * flip to the Supabase backend once URL + key are set in Settings.
 */
export const api: TradingClient = USE_MOCK ? mockApi : new SupabaseBackend();
