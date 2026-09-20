// trademuse-api: backend for the TradeMuse mobile app.
// verify_jwt=false. Every request must carry header x-trademuse-key equal
// to the TRADEMUSE_API_KEY function secret. JSON body: {action, ...params}.
//
// Actions: settings_get, settings_update, account, positions, orders,
// quotes, proposal_create, proposal_list, proposal_approve, proposal_reject,
// order_place.
//
// Paper trading only until live is explicitly enabled. Live order placement
// is hard-gated server side and can never fire without live_enabled=true.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const API_KEY = Deno.env.get("TRADEMUSE_API_KEY") || "";
const APCA_ID = Deno.env.get("APCA_API_KEY_ID") || "";
const APCA_SECRET = Deno.env.get("APCA_API_SECRET_KEY") || "";
const ALPACA_BASE = "https://paper-api.alpaca.markets";
const ALPACA_DATA = "https://data.alpaca.markets";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-trademuse-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}
const ok = (obj) => json(200, obj);
const bad = (status, code, message) => json(status, { error: code, message });

// ---------- Supabase (service role) ----------
async function sb(path, method, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!res.ok) throw { status: 500, code: "db_error", message: `Database error: ${text.slice(0, 200)}` };
  return data;
}

async function getSettings() {
  const rows = await sb("trademuse_settings?id=eq.1", "GET");
  if (!rows || rows.length === 0) throw { status: 500, code: "db_error", message: "Settings row missing" };
  return rows[0];
}

async function logActivity(kind, summary, detail) {
  try {
    await sb("trademuse_activity", "POST", { kind, summary, detail: detail || {} });
  } catch { /* activity logging must never break the main flow */ }
}

// ---------- Alpaca ----------
function alpacaConfigured() { return !!(APCA_ID && APCA_SECRET); }

async function alpaca(path, method, body, base) {
  if (!alpacaConfigured()) throw { status: 503, code: "alpaca_not_configured", message: "Alpaca paper API keys are not set yet." };
  const res = await fetch(`${base || ALPACA_BASE}${path}`, {
    method: method || "GET",
    headers: {
      "APCA-API-KEY-ID": APCA_ID,
      "APCA-API-SECRET-KEY": APCA_SECRET,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!res.ok) {
    const msg = (data && data.message) || text.slice(0, 200) || `Alpaca HTTP ${res.status}`;
    throw { status: 502, code: "alpaca_error", message: `Alpaca error: ${msg}` };
  }
  return data;
}

async function latestPrice(symbol) {
  const data = await alpaca(`/v2/stocks/quotes/latest?symbols=${encodeURIComponent(symbol)}&feed=iex`, "GET", undefined, ALPACA_DATA);
  const q = data && data.quotes && data.quotes[symbol];
  const px = q && (q.ap || q.bp);
  return px ? Number(px) : null;
}

// ---------- Guardrails ----------
async function checkGuards(s, symbol, side, qty, orderType, limitPrice) {
  if (s.kill_switch) return { ok: false, code: "kill_switch_on", message: "Kill switch is on. All order placement is blocked." };
  if (s.mode === "live" && !s.live_enabled) {
    return { ok: false, code: "live_not_enabled", message: "Live trading is not enabled. Orders cannot be placed." };
  }
  let price = null;
  if (orderType === "limit" && limitPrice) {
    price = Number(limitPrice);
  } else {
    try { price = await latestPrice(symbol); } catch { price = null; }
  }
  if (!price || !(price > 0)) {
    return { ok: false, code: "price_unavailable", message: `Could not price ${symbol}. Use a limit order with a limit price.` };
  }
  const notional = Number(qty) * price;
  if (notional > Number(s.max_position_usd)) {
    return { ok: false, code: "position_limit", message: `Order notional $${notional.toFixed(2)} exceeds max position $${Number(s.max_position_usd).toFixed(2)}.` };
  }
  try {
    const acct = await alpaca("/v2/account");
    const dayPnl = Number(acct.equity) - Number(acct.last_equity);
    if (dayPnl < -Number(s.max_daily_loss_usd)) {
      return { ok: false, code: "daily_loss_limit", message: `Today's P&L ($${dayPnl.toFixed(2)}) is below your daily loss limit of $${Number(s.max_daily_loss_usd).toFixed(2)}.` };
    }
  } catch (e) {
    if (e && e.code === "alpaca_not_configured") throw e;
    // If the account check itself fails, fail closed.
    return { ok: false, code: "account_check_failed", message: "Could not verify account day P&L. Order blocked." };
  }
  return { ok: true, price };
}

function validateOrderInput(p) {
  const symbol = String(p.symbol || "").trim().toUpperCase();
  const side = String(p.side || "").toLowerCase();
  const qty = Number(p.qty);
  const orderType = String(p.order_type || "market").toLowerCase();
  if (!symbol || !/^[A-Z.]{1,10}$/.test(symbol)) throw { status: 400, code: "bad_symbol", message: "A valid stock symbol is required." };
  if (side !== "buy" && side !== "sell") throw { status: 400, code: "bad_side", message: "Side must be buy or sell." };
  if (!(qty > 0) || !Number.isFinite(qty)) throw { status: 400, code: "bad_qty", message: "Quantity must be a positive number." };
  if (orderType !== "market" && orderType !== "limit") throw { status: 400, code: "bad_order_type", message: "Order type must be market or limit." };
  let limitPrice = null;
  if (orderType === "limit") {
    limitPrice = Number(p.limit_price);
    if (!(limitPrice > 0) || !Number.isFinite(limitPrice)) throw { status: 400, code: "bad_limit_price", message: "Limit orders need a positive limit price." };
  }
  return { symbol, side, qty, orderType, limitPrice };
}

async function placeOrderCore(p) {
  const v = validateOrderInput(p);
  const s = await getSettings();
  const g = await checkGuards(s, v.symbol, v.side, v.qty, v.orderType, v.limitPrice);
  if (!g.ok) {
    await logActivity("order_rejected", `Order rejected: ${v.side} ${v.qty} ${v.symbol}`, { ...v, reason: g.code, message: g.message, mode: s.mode });
    return { rejected: true, code: g.code, message: g.message };
  }
  const orderBody = { symbol: v.symbol, qty: String(v.qty), side: v.side, type: v.orderType, time_in_force: "day" };
  if (v.orderType === "limit") orderBody.limit_price = String(v.limitPrice);
  const order = await alpaca("/v2/orders", "POST", orderBody);
  await logActivity("order_placed", `${v.side} ${v.qty} ${v.symbol} ${v.orderType} placed (${s.mode})`, { ...v, price: g.price, alpaca_order_id: order && order.id, mode: s.mode });
  return { rejected: false, order };
}

// ---------- Actions ----------
const actions = {
  settings_get: async () => ok({ settings: await getSettings() }),

  settings_update: async (p) => {
    const s = await getSettings();
    const patch = {};
    if (p.mode !== undefined) {
      if (p.mode !== "paper" && p.mode !== "live") throw { status: 400, code: "bad_mode", message: "Mode must be paper or live." };
      patch.mode = p.mode;
    }
    if (p.live_enabled !== undefined) {
      if (p.live_enabled === true && p.confirm_live !== true) {
        throw { status: 400, code: "confirm_required", message: "Enabling live trading requires explicit confirm_live: true." };
      }
      patch.live_enabled = !!p.live_enabled;
    }
    if (p.max_position_usd !== undefined) {
      const n = Number(p.max_position_usd);
      if (!(n > 0) || !Number.isFinite(n)) throw { status: 400, code: "bad_value", message: "max_position_usd must be positive." };
      patch.max_position_usd = n;
    }
    if (p.max_daily_loss_usd !== undefined) {
      const n = Number(p.max_daily_loss_usd);
      if (!(n > 0) || !Number.isFinite(n)) throw { status: 400, code: "bad_value", message: "max_daily_loss_usd must be positive." };
      patch.max_daily_loss_usd = n;
    }
    if (p.kill_switch !== undefined) patch.kill_switch = !!p.kill_switch;
    const merged = { ...s, ...patch };
    if (merged.mode === "live" && !merged.live_enabled) {
      throw { status: 400, code: "live_not_enabled", message: "Live mode requires live_enabled with confirm_live: true." };
    }
    if (Object.keys(patch).length === 0) return ok({ settings: s });
    patch.updated_at = new Date().toISOString();
    const rows = await sb("trademuse_settings?id=eq.1", "PATCH", patch);
    return ok({ settings: rows[0] });
  },

  account: async () => ok({ account: await alpaca("/v2/account") }),
  positions: async () => ok({ positions: await alpaca("/v2/positions") }),
  orders: async () => ok({ orders: await alpaca("/v2/orders?status=all&limit=50&direction=desc") }),

  quotes: async (p) => {
    const symbols = Array.isArray(p.symbols) ? p.symbols.map((x) => String(x).trim().toUpperCase()).filter(Boolean).slice(0, 20) : [];
    if (symbols.length === 0) throw { status: 400, code: "bad_symbols", message: "symbols[] is required." };
    try {
      const data = await alpaca(`/v2/stocks/quotes/latest?symbols=${encodeURIComponent(symbols.join(","))}&feed=iex`, "GET", undefined, ALPACA_DATA);
      const out = {};
      for (const sym of symbols) {
        const q = data && data.quotes && data.quotes[sym];
        out[sym] = q ? { ask: q.ap ? Number(q.ap) : null, bid: q.bp ? Number(q.bp) : null, time: q.t || null } : null;
      }
      return ok({ quotes: out });
    } catch (e) {
      if (e && (e.code === "alpaca_not_configured")) throw e;
      return ok({ quotes: {}, warning: "market_data_unavailable" });
    }
  },

  proposal_create: async (p) => {
    const v = validateOrderInput(p);
    const confidence = p.confidence === undefined ? 50 : Number(p.confidence);
    if (!(confidence >= 0 && confidence <= 100)) throw { status: 400, code: "bad_confidence", message: "Confidence must be 0 to 100." };
    const rows = await sb("trademuse_proposals", "POST", {
      symbol: v.symbol, side: v.side, qty: v.qty, order_type: v.orderType,
      limit_price: v.limitPrice, rationale: String(p.rationale || ""), confidence,
    });
    const proposal = rows[0];
    await logActivity("proposal_created", `Proposal: ${v.side} ${v.qty} ${v.symbol} (${v.orderType})`, { proposal_id: proposal.id, ...v, confidence });
    return ok({ proposal });
  },

  proposal_list: async () => {
    const rows = await sb("trademuse_proposals?order=created_at.desc&limit=100", "GET");
    const rank = { pending: 0, approved: 1, executed: 2, failed: 3, rejected: 4 };
    rows.sort((a, b) => (rank[a.status] ?? 5) - (rank[b.status] ?? 5));
    return ok({ proposals: rows });
  },

  proposal_approve: async (p) => {
    if (!p.id) throw { status: 400, code: "bad_id", message: "Proposal id is required." };
    const rows = await sb(`trademuse_proposals?id=eq.${encodeURIComponent(p.id)}`, "GET");
    const prop = rows && rows[0];
    if (!prop) throw { status: 404, code: "not_found", message: "Proposal not found." };
    if (prop.status !== "pending") throw { status: 400, code: "bad_status", message: `Proposal is ${prop.status}, only pending proposals can be approved.` };
    const decided = await sb(`trademuse_proposals?id=eq.${encodeURIComponent(p.id)}`, "PATCH", { status: "approved", decided_at: new Date().toISOString() });
    await logActivity("proposal_approved", `Approved: ${prop.side} ${prop.qty} ${prop.symbol}`, { proposal_id: prop.id });
    try {
      const r = await placeOrderCore({ symbol: prop.symbol, side: prop.side, qty: prop.qty, order_type: prop.order_type, limit_price: prop.limit_price });
      if (r.rejected) {
        const f = await sb(`trademuse_proposals?id=eq.${encodeURIComponent(p.id)}`, "PATCH", { status: "failed", note: r.message });
        return ok({ proposal: f[0], result: "rejected", code: r.code, message: r.message });
      }
      const e = await sb(`trademuse_proposals?id=eq.${encodeURIComponent(p.id)}`, "PATCH", { status: "executed", alpaca_order_id: r.order && r.order.id });
      return ok({ proposal: e[0], result: "executed", order: r.order });
    } catch (e) {
      const msg = (e && e.message) || "Order placement failed.";
      const f = await sb(`trademuse_proposals?id=eq.${encodeURIComponent(p.id)}`, "PATCH", { status: "failed", note: msg });
      await logActivity("order_rejected", `Approved proposal failed: ${prop.symbol}`, { proposal_id: prop.id, message: msg });
      return ok({ proposal: f[0], result: "failed", message: msg });
    }
  },

  proposal_reject: async (p) => {
    if (!p.id) throw { status: 400, code: "bad_id", message: "Proposal id is required." };
    const rows = await sb(`trademuse_proposals?id=eq.${encodeURIComponent(p.id)}`, "GET");
    const prop = rows && rows[0];
    if (!prop) throw { status: 404, code: "not_found", message: "Proposal not found." };
    if (prop.status !== "pending") throw { status: 400, code: "bad_status", message: `Proposal is ${prop.status}, only pending proposals can be rejected.` };
    const r = await sb(`trademuse_proposals?id=eq.${encodeURIComponent(p.id)}`, "PATCH", { status: "rejected", decided_at: new Date().toISOString(), note: String(p.note || "") });
    await logActivity("proposal_rejected", `Rejected: ${prop.side} ${prop.qty} ${prop.symbol}`, { proposal_id: prop.id });
    return ok({ proposal: r[0] });
  },

  order_place: async (p) => {
    const r = await placeOrderCore(p);
    if (r.rejected) return bad(422, r.code, r.message);
    return ok({ order: r.order });
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return bad(405, "method_not_allowed", "Use POST.");
  if (!API_KEY || req.headers.get("x-trademuse-key") !== API_KEY) {
    return bad(401, "unauthorized", "Missing or invalid x-trademuse-key.");
  }
  let body;
  try { body = await req.json(); } catch { return bad(400, "invalid_json", "Request body must be JSON."); }
  const fn = actions[body && body.action];
  if (!fn) return bad(400, "bad_action", `Unknown action: ${body && body.action}.`);
  try {
    return await fn(body);
  } catch (e) {
    if (e && e.status) return bad(e.status, e.code || "error", e.message || "Request failed.");
    return bad(500, "internal_error", "Unexpected error.");
  }
});
