import { z } from "zod";
import { defaultWatermellonConfig } from "./spec";
import type { AppConfig, Mode, PeachConfig, RiskConfig, WatermellonConfig } from "./types";

const envSchema = z.object({
  ASTER_RPC_URL: z.string().url(),
  ASTER_WS_URL: z.string().url(),
  ASTER_API_KEY: z.string().min(1, "API key is required"),
  ASTER_API_SECRET: z.string().min(1, "API secret is required"),
  ASTER_PRIVATE_KEY: z.string().min(1, "Private key is required"),
  PAIR_SYMBOL: z.string().min(1, "Trading pair is required"),
  MAX_POSITION_USDT: z.coerce.number().positive(),
  MAX_LEVERAGE: z.coerce.number().positive(),
  MAX_FLIPS_PER_HOUR: z.coerce.number().int().nonnegative(),
  STOP_LOSS_PCT: z.coerce.number().optional(),
  TAKE_PROFIT_PCT: z.coerce.number().optional(),
  POSITION_SIZE_PCT: z.coerce.number().min(0).max(100).optional(),
  REQUIRE_TRENDING_MARKET: z.coerce.boolean().optional(),
  ADX_THRESHOLD: z.coerce.number().min(0).max(100).optional(),
  MODE: z.enum(["dry-run", "live"]),
  STRATEGY_TYPE: z.enum(["watermellon", "peach-hybrid"]).optional(),
  VIRTUAL_TIMEFRAME_MS: z.coerce.number().optional(),
  // Watermellon params
  EMA_FAST: z.coerce.number().optional(),
  EMA_MID: z.coerce.number().optional(),
  EMA_SLOW: z.coerce.number().optional(),
  RSI_LENGTH: z.coerce.number().optional(),
  RSI_MIN_LONG: z.coerce.number().optional(),
  RSI_MAX_SHORT: z.coerce.number().optional(),
  // Peach Hybrid V1 params
  PEACH_V1_EMA_FAST: z.coerce.number().optional(),
  PEACH_V1_EMA_MID: z.coerce.number().optional(),
  PEACH_V1_EMA_SLOW: z.coerce.number().optional(),
  PEACH_V1_EMA_MICRO_FAST: z.coerce.number().optional(),
  PEACH_V1_EMA_MICRO_SLOW: z.coerce.number().optional(),
  PEACH_V1_RSI_LENGTH: z.coerce.number().optional(),
  PEACH_V1_RSI_MIN_LONG: z.coerce.number().optional(),
  PEACH_V1_RSI_MAX_SHORT: z.coerce.number().optional(),
  PEACH_V1_MIN_BARS_BETWEEN: z.coerce.number().optional(),
  PEACH_V1_MIN_MOVE_PCT: z.coerce.number().optional(),
  // Peach Hybrid V2 params
  PEACH_V2_EMA_FAST: z.coerce.number().optional(),
  PEACH_V2_EMA_MID: z.coerce.number().optional(),
  PEACH_V2_EMA_SLOW: z.coerce.number().optional(),
  PEACH_V2_RSI_MOMENTUM_THRESHOLD: z.coerce.number().optional(),
  PEACH_V2_VOLUME_LOOKBACK: z.coerce.number().optional(),
  PEACH_V2_VOLUME_MULTIPLIER: z.coerce.number().optional(),
  PEACH_V2_EXIT_VOLUME_MULTIPLIER: z.coerce.number().optional(),
  // Risk management
  USE_STOP_LOSS: z.coerce.boolean().optional(),
  EMERGENCY_STOP_LOSS_PCT: z.coerce.number().optional(),
  MAX_POSITIONS: z.coerce.number().optional(),
});

const formatErrors = (issues: z.ZodIssue[]): string =>
  issues.map((i) => `${i.path.join(".") || "env"}: ${i.message}`).join("; ");

export const loadConfig = (overrides?: Partial<AppConfig>): AppConfig => {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration: ${formatErrors(parsed.error.issues)}`);
  }

  const env = parsed.data;
  const strategyType = env.STRATEGY_TYPE ?? "watermellon";

  let strategy: WatermellonConfig | PeachConfig;
  
  if (strategyType === "peach-hybrid") {
    // Peach Hybrid Strategy
    strategy = {
      timeframeMs: env.VIRTUAL_TIMEFRAME_MS ?? 30_000,
      v1: {
        emaFastLen: env.PEACH_V1_EMA_FAST ?? 8,
        emaMidLen: env.PEACH_V1_EMA_MID ?? 21,
        emaSlowLen: env.PEACH_V1_EMA_SLOW ?? 48,
        emaMicroFastLen: env.PEACH_V1_EMA_MICRO_FAST ?? 5,
        emaMicroSlowLen: env.PEACH_V1_EMA_MICRO_SLOW ?? 13,
        rsiLength: env.PEACH_V1_RSI_LENGTH ?? 14,
        rsiMinLong: env.PEACH_V1_RSI_MIN_LONG ?? 42.0,
        rsiMaxShort: env.PEACH_V1_RSI_MAX_SHORT ?? 58.0,
        minBarsBetween: env.PEACH_V1_MIN_BARS_BETWEEN ?? 1,
        minMovePercent: env.PEACH_V1_MIN_MOVE_PCT ?? 0.10,
      },
      v2: {
        emaFastLen: env.PEACH_V2_EMA_FAST ?? 3,
        emaMidLen: env.PEACH_V2_EMA_MID ?? 8,
        emaSlowLen: env.PEACH_V2_EMA_SLOW ?? 13,
        rsiMomentumThreshold: env.PEACH_V2_RSI_MOMENTUM_THRESHOLD ?? 3.0,
        volumeLookback: env.PEACH_V2_VOLUME_LOOKBACK ?? 4,
        volumeMultiplier: env.PEACH_V2_VOLUME_MULTIPLIER ?? 1.5,
        exitVolumeMultiplier: env.PEACH_V2_EXIT_VOLUME_MULTIPLIER ?? 1.2,
      },
    };
  } else {
    // Watermellon Strategy (default)
    strategy = {
      ...defaultWatermellonConfig,
      timeframeMs: env.VIRTUAL_TIMEFRAME_MS ?? defaultWatermellonConfig.timeframeMs,
      emaFastLen: env.EMA_FAST ?? defaultWatermellonConfig.emaFastLen,
      emaMidLen: env.EMA_MID ?? defaultWatermellonConfig.emaMidLen,
      emaSlowLen: env.EMA_SLOW ?? defaultWatermellonConfig.emaSlowLen,
      rsiLength: env.RSI_LENGTH ?? defaultWatermellonConfig.rsiLength,
      rsiMinLong: env.RSI_MIN_LONG ?? defaultWatermellonConfig.rsiMinLong,
      rsiMaxShort: env.RSI_MAX_SHORT ?? defaultWatermellonConfig.rsiMaxShort,
    };
  }

  const risk: RiskConfig = {
    maxPositionSize: env.MAX_POSITION_USDT,
    maxLeverage: env.MAX_LEVERAGE,
    maxFlipsPerHour: env.MAX_FLIPS_PER_HOUR,
    stopLossPct: env.STOP_LOSS_PCT ?? undefined,
    takeProfitPct: env.TAKE_PROFIT_PCT ?? undefined,
    useStopLoss: env.USE_STOP_LOSS ?? false,
    emergencyStopLoss: env.EMERGENCY_STOP_LOSS_PCT ?? 2.0,
    maxPositions: env.MAX_POSITIONS ?? 1,
    positionSizePct: env.POSITION_SIZE_PCT ?? undefined,
    requireTrendingMarket: env.REQUIRE_TRENDING_MARKET ?? false,
    adxThreshold: env.ADX_THRESHOLD ?? 25,
  };

  const config: AppConfig = {
    mode: env.MODE as Mode,
    strategyType: strategyType as "watermellon" | "peach-hybrid",
    credentials: {
      rpcUrl: env.ASTER_RPC_URL,
      wsUrl: env.ASTER_WS_URL,
      apiKey: env.ASTER_API_KEY,
      apiSecret: env.ASTER_API_SECRET,
      privateKey: env.ASTER_PRIVATE_KEY,
      pairSymbol: env.PAIR_SYMBOL,
    },
    strategy,
    risk,
  };

  return overrides ? mergeConfig(config, overrides) : config;
};

const mergeConfig = (base: AppConfig, overrides: Partial<AppConfig>): AppConfig => ({
  ...base,
  ...overrides,
  credentials: { ...base.credentials, ...overrides?.credentials },
  strategy: { ...base.strategy, ...overrides?.strategy },
  risk: { ...base.risk, ...overrides?.risk },
});

