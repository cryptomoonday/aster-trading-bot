## Watermellon Scalper Bot (AsterDEX)

Next.js + TypeScript codebase that recreates the TradingView “Watermellon” script (EMA 8/21/48 + RSI14) on top of AsterDEX ticks. The app currently exposes the spec/UI scaffold plus a core library for synthetic 30 s bars, indicator math, and Watermellon trigger logic. Execution, risk, and exchange connectivity will be layered on top of these primitives.

### Prerequisites

- Node.js 20+
- npm (bundled) or pnpm/bun if you prefer, but scripts assume npm

### Install & run

```bash
cd aster-bot
npm install
npm run dev   # spec/dashboard
npm run bot   # headless trading loop
```

Visit `http://localhost:3000` for the spec dashboard. `npm run bot` loads `.env.local`, connects to the tick stream, and runs the Watermellon engine (dry-run adapter by default).

### Environment

Copy the sample vars and adjust:

```bash
cp env.example .env.local
```

| Variable | Description |
| --- | --- |
| `ASTER_RPC_URL`, `ASTER_WS_URL` | HTTPS + WebSocket endpoints for AsterDEX |
| `ASTER_API_KEY` / `ASTER_API_SECRET` | API credentials created on asterdex.com |
| `ASTER_PRIVATE_KEY` | Wallet key dedicated to this bot |
| `PAIR_SYMBOL` | Market to trade (e.g., `ASTERUSDT-PERP`) |
| Strategy overrides | Optional `VIRTUAL_TIMEFRAME_MS`, `EMA_FAST`, `EMA_MID`, `EMA_SLOW`, `RSI_LENGTH`, `RSI_MIN_LONG`, `RSI_MAX_SHORT` |
| Risk params | `MAX_POSITION_USDT`, `MAX_LEVERAGE`, `MAX_FLIPS_PER_HOUR`, optional `STOP_LOSS_PCT`, `TAKE_PROFIT_PCT` |
| `MODE` | `dry-run` or `live` |

### Project layout

```
src/
  app/                 # Next.js dashboard + spec route
  bot/                 # Headless runner entry (npm run bot)
  lib/
    bot/               # Strategy orchestration
    indicators/        # EMA / RSI
    execution/         # Dry-run/live adapters
    tickStream.ts      # WebSocket feed client
    config.ts          # Zod env parser
    virtualBarBuilder.ts
    watermellonEngine.ts
```

The bot includes synthetic bar building, indicator math, risk-aware position management, and a dry-run executor that logs trades. Swap in a live execution adapter when you’re ready to send real orders.
