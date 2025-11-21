import type { WatermellonConfig } from "./types";

export const defaultWatermellonConfig: WatermellonConfig = {
  timeframeMs: 30_000,
  emaFastLen: 8,
  emaMidLen: 21,
  emaSlowLen: 48,
  rsiLength: 14,
  rsiMinLong: 42,
  rsiMaxShort: 58,
};

export const moonSpec = {
  project: "Watermellon Scalper Bot for AsterDEX",
  instrument: "ASTERUSDT perp",
  summary:
    "Recreate the TradingView Watermellon strategy (3 EMA stack + RSI filters) using synthetic 30-second bars built from raw AsterDEX ticks.",
  dataFeed: {
    source: "AsterDEX WebSocket ticks",
    fields: ["timestamp", "last_price", "size"],
    timeframe: "synthetic 30-second OHLCV",
  },
  indicators: {
    type: "EMA/RSI",
    parameters: defaultWatermellonConfig,
    notes: [
      "EMA stack acts as trend gate (fast > mid > slow for longs, inverse for shorts).",
      "RSI(14) thresholds: >42 for long look, <58 for short look.",
      "Signals trigger only on rising edges to avoid duplicate entries.",
    ],
  },
  tradingRules: [
    "Flat → open long on longTrig, open short on shortTrig.",
    "If long and shortTrig fires → close (optional flip).",
    "If short and longTrig fires → close (optional flip).",
  ],
  risk: [
    "Configurable max position size and leverage ceiling.",
    "Optional stop-loss / take-profit percentages from entry.",
    "Flip budget (per hour/session) to avoid churn.",
    "Dedicated wallet for the bot; no withdrawal permissions.",
  ],
  runtime: {
    modes: ["dry-run", "live"],
    logging: ["structured JSON logs", "dashboard streaming"],
    requirements: [
      "README with setup instructions.",
      ".env template covering RPC URLs, keys, and risk params.",
      "Single command to start the bot.",
    ],
  },
};

