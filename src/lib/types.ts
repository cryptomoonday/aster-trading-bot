export type Tick = {
  timestamp: number;
  price: number;
  size?: number;
};

export type SyntheticBar = {
  startTime: number;
  endTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type IndicatorSnapshot = {
  emaFast: number;
  emaMid: number;
  emaSlow: number;
  rsi: number;
};

export type TrendSnapshot = {
  bullStack: boolean;
  bearStack: boolean;
  longLook: boolean;
  shortLook: boolean;
  longTrig: boolean;
  shortTrig: boolean;
};

export type StrategySignal =
  | {
      type: "long";
      reason: "long-trigger" | "v1-long" | "v2-long";
      indicators: IndicatorSnapshot;
      trend: TrendSnapshot;
      system?: "v1" | "v2";
    }
  | {
      type: "short";
      reason: "short-trigger" | "v1-short" | "v2-short";
      indicators: IndicatorSnapshot;
      trend: TrendSnapshot;
      system?: "v1" | "v2";
    }
  | null;

export type ExitSignal = {
  reason: "rsi-flattening" | "volume-drop" | "opposite-signal" | "stop-loss" | "emergency-stop";
  details?: Record<string, unknown>;
};

export type WatermellonConfig = {
  timeframeMs: number;
  emaFastLen: number;
  emaMidLen: number;
  emaSlowLen: number;
  rsiLength: number;
  rsiMinLong: number;
  rsiMaxShort: number;
};

// Peach Hybrid Strategy Configuration
export type PeachV1Config = {
  emaFastLen: number; // 8
  emaMidLen: number; // 21
  emaSlowLen: number; // 48
  emaMicroFastLen: number; // 5
  emaMicroSlowLen: number; // 13
  rsiLength: number; // 14
  rsiMinLong: number; // 42.0
  rsiMaxShort: number; // 58.0
  minBarsBetween: number; // 1
  minMovePercent: number; // 0.10
};

export type PeachV2Config = {
  emaFastLen: number; // 3
  emaMidLen: number; // 8
  emaSlowLen: number; // 13
  rsiMomentumThreshold: number; // 3.0 points in 2 bars
  volumeLookback: number; // 4 candles
  volumeMultiplier: number; // 1.5x average
  exitVolumeMultiplier: number; // 1.2x average
};

export type PeachConfig = {
  timeframeMs: number;
  v1: PeachV1Config;
  v2: PeachV2Config;
};

export type RiskConfig = {
  maxPositionSize: number;
  maxLeverage: number;
  maxFlipsPerHour: number;
  stopLossPct?: number;
  takeProfitPct?: number;
  // Peach Hybrid Risk Management
  useStopLoss?: boolean; // false
  emergencyStopLoss?: number; // 2.0%
  maxPositions?: number; // 1 at a time
  // Position sizing
  positionSizePct?: number; // Percentage of available balance (0-100), overrides maxPositionSize if set
  // Market regime filters
  requireTrendingMarket?: boolean; // Only trade when market is trending (ADX > threshold)
  adxThreshold?: number; // ADX threshold for trending market (default: 25)
};

export type Mode = "dry-run" | "live";

export type Credentials = {
  rpcUrl: string;
  wsUrl: string;
  apiKey: string;
  apiSecret: string;
  privateKey: string;
  pairSymbol: string;
};

export type AppConfig = {
  mode: Mode;
  credentials: Credentials;
  strategy: WatermellonConfig | PeachConfig;
  risk: RiskConfig;
  strategyType?: "watermellon" | "peach-hybrid";
};

export type PositionSide = "long" | "short" | "flat";

export type PositionState = {
  side: PositionSide;
  size: number;
  entryPrice?: number;
  openedAt?: number;
};

export type TradeInstruction = {
  side: Exclude<PositionSide, "flat">;
  size: number;
  leverage: number;
  price: number;
  signalReason: string;
  timestamp: number;
};

export type ExecutionAdapter = {
  enterLong(order: TradeInstruction): Promise<void>;
  enterShort(order: TradeInstruction): Promise<void>;
  closePosition(reason: string, meta?: Record<string, unknown>): Promise<void>;
};

