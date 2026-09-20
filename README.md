# TradingApp

A mobile trading app (iOS and Android) with an AI agent workflow. Built with
Expo, React Native, and TypeScript. One codebase, two app stores.

**Current state: scaffold with a mock data layer. Paper trading only. No real
money moves. No backend is connected yet.**

## Architecture

```
trading-app/
  app/
    _layout.tsx            Root stack + shared app state provider
    (tabs)/
      _layout.tsx          Bottom tab navigator (5 tabs)
      index.tsx            Dashboard: equity, buying power, day P&L, positions
      markets.tsx          Watchlist, quotes, symbol search and add
      trade.tsx            Manual order ticket with preview and confirm
      muse.tsx             Agent trade proposals (approve / reject) + activity log
      settings.tsx         Mode toggle, guardrails, kill switch, backend URL
  lib/
    api.ts                 Typed async backend client (mock implementation today)
    mockData.ts            Mock account, positions, quotes, orders, proposals
    store.ts               Shared state: mode, guardrails, backend URL
  components/
    ui.tsx                 Theme + shared primitives (cards, buttons, pills)
  app.json                 Expo config (bundle IDs are placeholders)
  eas.json                 Build profiles for EAS
```

### How the agent API will work

The phone never talks to the broker directly. The flow is:

1. **Muse proposes.** The agent analyzes the market and calls
   `POST /proposals` on our backend with symbol, side, quantity, order type,
   and a written rationale. The proposal appears in the Muse tab.
2. **You approve or reject in the app.** Nothing executes without an explicit
   tap. Approvals are per proposal; there is no standing auto trade permission.
3. **The backend places the order.** On approval, the backend checks your
   guardrails and the kill switch server side, then submits the order to
   Alpaca and streams the fill status back to the app.

Manual orders from the Trade tab follow the same path: the app sends the
order ticket to the backend, and the backend enforces guardrails before
touching Alpaca.

### The backend contract (`lib/api.ts`)

The `TradingClient` interface is the full contract the backend must satisfy:

- `getAccount(mode)` / `getPositions(mode)` / `getOrders(mode)`
- `getQuotes(symbols)`
- `createProposal(input)` / `listProposals()`
- `approveProposal(id, mode)` / `rejectProposal(id)`
- `placeOrder(input, mode)`
- `getActivity()`

Every method is implemented against mock data today (`USE_MOCK = true`).
Each method body carries a TODO marking where the Supabase edge function
call goes. Flip `USE_MOCK` only when the backend is live.

### Security rules

- No API keys, secrets, or broker credentials anywhere in the app code.
  Alpaca keys live on the backend only.
- The phone authenticates to the backend with the user's session token.
- Guardrails and the kill switch are enforced both in the app UI and,
  eventually, on the backend, so a compromised client cannot bypass them.

## Screen map

| Tab       | What it does |
|-----------|--------------|
| Dashboard | Portfolio equity, buying power, day P&L, and the positions list. Pull to refresh. |
| Markets   | Watchlist with last price and day change. Search any known symbol and add it. |
| Trade     | Order ticket: side, symbol, quantity, market or limit. Shows an order preview, checks the max position guardrail, and confirms with a mock fill in paper mode. |
| Muse      | Pending trade proposals with rationale and confidence, approve / reject buttons, and a full activity log. Approving in paper mode executes the mock order. |
| Settings  | Paper / Live mode toggle (live is hard gated), guardrails form, kill switch, backend URL. |

Live mode can never be switched on from the phone alone. Tapping Live opens
a risk disclosure sheet; even after acknowledging, the mode stays Paper and
all live paths remain inert until a backend flag enables them.

## Development

```bash
npm install
npx expo start
```

Run `npm run typecheck` for a TypeScript check. Do not commit secrets.

## Roadmap

1. **Backend (Supabase):** edge functions for account, positions, orders,
   quotes, and proposals; Alpaca paper API integration; session auth.
2. **Paper wiring:** flip `USE_MOCK` to false, point the app at the backend,
   verify end to end with Alpaca paper trading.
3. **Live gating:** backend controlled live enablement flag, server side
   guardrail enforcement, audit log of every approval and order.
4. **Store submission:** finalized app name and bundle IDs, app icons and
   screenshots, privacy policy, Apple App Store and Google Play listings.
   Finance apps face strict review; the listing must disclose that the app
   routes orders through a licensed broker and is not investment advice.

## Risk disclaimer

Trading stocks and ETFs involves real financial risk, including the possible
loss of your entire investment. This app is a tool, not investment advice.
Nothing in the app, including agent proposals and rationales, should be
treated as a recommendation to buy or sell any security. Paper trading
results do not predict live results. Only trade with money you can afford
to lose, and review every order before you confirm it.
