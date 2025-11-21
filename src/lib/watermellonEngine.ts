import { EMA } from "./indicators/ema";
import { RSI } from "./indicators/rsi";
import type {
  IndicatorSnapshot,
  StrategySignal,
  TrendSnapshot,
  WatermellonConfig,
} from "./types";

const DEFAULT_CONFIG: WatermellonConfig = {
  timeframeMs: 30_000,
  emaFastLen: 8,
  emaMidLen: 21,
  emaSlowLen: 48,
  rsiLength: 14,
  rsiMinLong: 42,
  rsiMaxShort: 58,
};

export class WatermellonEngine {
  private readonly config: WatermellonConfig;
  private readonly emaFast: EMA;
  private readonly emaMid: EMA;
  private readonly emaSlow: EMA;
  private readonly rsi: RSI;
  private lastLongLook = false;
  private lastShortLook = false;

  constructor(config?: Partial<WatermellonConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.emaFast = new EMA(this.config.emaFastLen);
    this.emaMid = new EMA(this.config.emaMidLen);
    this.emaSlow = new EMA(this.config.emaSlowLen);
    this.rsi = new RSI(this.config.rsiLength);
  }

  update(closePrice: number): StrategySignal {
    const emaFastValue = this.emaFast.update(closePrice);
    const emaMidValue = this.emaMid.update(closePrice);
    const emaSlowValue = this.emaSlow.update(closePrice);
    const rsiValue = this.rsi.update(closePrice);

    const indicators: IndicatorSnapshot = {
      emaFast: emaFastValue,
      emaMid: emaMidValue,
      emaSlow: emaSlowValue,
      rsi: rsiValue,
    };

    const bullStack = emaFastValue > emaMidValue && emaMidValue > emaSlowValue;
    const bearStack = emaFastValue < emaMidValue && emaMidValue < emaSlowValue;

    const longLook = bullStack && rsiValue > this.config.rsiMinLong;
    const shortLook = bearStack && rsiValue < this.config.rsiMaxShort;

    const longTrig = longLook && !this.lastLongLook;
    const shortTrig = shortLook && !this.lastShortLook;

    this.lastLongLook = longLook;
    this.lastShortLook = shortLook;

    const trend: TrendSnapshot = {
      bullStack,
      bearStack,
      longLook,
      shortLook,
      longTrig,
      shortTrig,
    };

    if (longTrig) {
      return { type: "long", reason: "long-trigger", indicators, trend };
    }

    if (shortTrig) {
      return { type: "short", reason: "short-trigger", indicators, trend };
    }

    return null;
  }

  get settings(): WatermellonConfig {
    return this.config;
  }

  getIndicatorValues(): {
    emaFast: number | null;
    emaMid: number | null;
    emaSlow: number | null;
    rsi: number | null;
  } {
    return {
      emaFast: this.emaFast.value,
      emaMid: this.emaMid.value,
      emaSlow: this.emaSlow.value,
      rsi: this.rsi.value,
    };
  }
}

