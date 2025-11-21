import { EMA } from "./indicators/ema";
import { RSI } from "./indicators/rsi";
import { ADX } from "./indicators/adx";
import type { PeachConfig, StrategySignal, SyntheticBar } from "./types";

export class PeachHybridEngine {
  private readonly config: PeachConfig;
  
  // V1 System (Trend/Bias)
  private readonly v1EmaFast: EMA;
  private readonly v1EmaMid: EMA;
  private readonly v1EmaSlow: EMA;
  private readonly v1EmaMicroFast: EMA;
  private readonly v1EmaMicroSlow: EMA;
  private readonly v1Rsi: RSI;
  private v1LastLongLook = false;
  private v1LastShortLook = false;
  private v1LastLongPrice = 0;
  private v1LastShortPrice = 0;
  private v1BarsSinceLastSignal = 0;
  
  // V2 System (Momentum Surge)
  private readonly v2EmaFast: EMA;
  private readonly v2EmaMid: EMA;
  private readonly v2EmaSlow: EMA;
  private readonly v2Rsi: RSI;
  private v2RsiHistory: number[] = [];
  private volumeHistory: number[] = [];
  private readonly adx: ADX;
  private position: { side: "long" | "short" | "flat" } | null = null;
  
  constructor(config: PeachConfig) {
    this.config = config;
    
    // Initialize V1 indicators
    this.v1EmaFast = new EMA(config.v1.emaFastLen);
    this.v1EmaMid = new EMA(config.v1.emaMidLen);
    this.v1EmaSlow = new EMA(config.v1.emaSlowLen);
    this.v1EmaMicroFast = new EMA(config.v1.emaMicroFastLen);
    this.v1EmaMicroSlow = new EMA(config.v1.emaMicroSlowLen);
    this.v1Rsi = new RSI(config.v1.rsiLength);
    
    // Initialize V2 indicators
    this.v2EmaFast = new EMA(config.v2.emaFastLen);
    this.v2EmaMid = new EMA(config.v2.emaMidLen);
    this.v2EmaSlow = new EMA(config.v2.emaSlowLen);
    this.v2Rsi = new RSI(14); // RSI length is 14, momentum threshold is separate
    this.adx = new ADX(14); // ADX for market regime detection
  }
  
  update(bar: SyntheticBar): StrategySignal | null {
    const closePrice = bar.close;
    const volume = bar.volume;
    
    // Update V1 indicators
    const v1EmaFast = this.v1EmaFast.update(closePrice);
    const v1EmaMid = this.v1EmaMid.update(closePrice);
    const v1EmaSlow = this.v1EmaSlow.update(closePrice);
    const v1EmaMicroFast = this.v1EmaMicroFast.update(closePrice);
    const v1EmaMicroSlow = this.v1EmaMicroSlow.update(closePrice);
    const v1Rsi = this.v1Rsi.update(closePrice);
    
    // Update V2 indicators
    const v2EmaFast = this.v2EmaFast.update(closePrice);
    const v2EmaMid = this.v2EmaMid.update(closePrice);
    const v2EmaSlow = this.v2EmaSlow.update(closePrice);
    const v2Rsi = this.v2Rsi.update(closePrice);

    // Update ADX for market regime detection
    this.adx.update(bar.high, bar.low, closePrice);
    
    // Track RSI history for momentum calculation
    if (v2Rsi !== null) {
      this.v2RsiHistory.push(v2Rsi);
      if (this.v2RsiHistory.length > 2) {
        this.v2RsiHistory.shift();
      }
    }
    
    // Track volume history (keep last N bars for average calculation)
    this.volumeHistory.push(volume);
    const maxVolumeHistory = Math.max(this.config.v2.volumeLookback, 10); // Keep at least 10 for better average
    if (this.volumeHistory.length > maxVolumeHistory) {
      this.volumeHistory.shift();
    }
    
    // Increment bars since last signal
    this.v1BarsSinceLastSignal++;
    
    // Check V1 System (Trend/Bias)
    const v1Signal = this.checkV1System(closePrice, v1EmaFast, v1EmaMid, v1EmaSlow, v1EmaMicroFast, v1EmaMicroSlow, v1Rsi);
    if (v1Signal) {
      return v1Signal;
    }
    
    // Check V2 System (Momentum Surge)
    const v2Signal = this.checkV2System(closePrice, v2EmaFast, v2EmaMid, v2EmaSlow, v2Rsi, volume, bar.open, bar.close);
    if (v2Signal) {
      return v2Signal;
    }
    
    return null;
  }
  
  private checkV1System(
    price: number,
    emaFast: number,
    emaMid: number,
    emaSlow: number,
    emaMicroFast: number,
    emaMicroSlow: number,
    rsi: number | null
  ): StrategySignal | null {
    if (rsi === null) return null;
    
    // V1: Bias flip + RSI threshold + trend confirmation
    const bullStack = emaFast > emaMid && emaMid > emaSlow;
    const bearStack = emaFast < emaMid && emaMid < emaSlow;
    const microBullStack = emaMicroFast > emaMicroSlow;
    const microBearStack = emaMicroFast < emaMicroSlow;
    
    const longLook = bullStack && microBullStack && rsi > this.config.v1.rsiMinLong;
    const shortLook = bearStack && microBearStack && rsi < this.config.v1.rsiMaxShort;
    
    // Check min bars between signals
    if (this.v1BarsSinceLastSignal < this.config.v1.minBarsBetween) {
      return null;
    }
    
    // Check min move percent
    let priceMoveMet = true;
    if (this.v1LastLongPrice > 0) {
      const movePercent = Math.abs((price - this.v1LastLongPrice) / this.v1LastLongPrice) * 100;
      priceMoveMet = movePercent >= this.config.v1.minMovePercent;
    }
    if (this.v1LastShortPrice > 0) {
      const movePercent = Math.abs((price - this.v1LastShortPrice) / this.v1LastShortPrice) * 100;
      priceMoveMet = priceMoveMet && movePercent >= this.config.v1.minMovePercent;
    }
    
    if (!priceMoveMet) {
      return null;
    }
    
    const longTrig = longLook && !this.v1LastLongLook;
    const shortTrig = shortLook && !this.v1LastShortLook;
    
    this.v1LastLongLook = longLook;
    this.v1LastShortLook = shortLook;
    
    if (longTrig) {
      this.v1LastLongPrice = price;
      this.v1BarsSinceLastSignal = 0;
      return {
        type: "long",
        reason: "v1-long",
        system: "v1",
        indicators: {
          emaFast,
          emaMid,
          emaSlow,
          rsi,
        },
        trend: {
          bullStack,
          bearStack,
          longLook,
          shortLook,
          longTrig,
          shortTrig,
        },
      };
    }
    
    if (shortTrig) {
      this.v1LastShortPrice = price;
      this.v1BarsSinceLastSignal = 0;
      return {
        type: "short",
        reason: "v1-short",
        system: "v1",
        indicators: {
          emaFast,
          emaMid,
          emaSlow,
          rsi,
        },
        trend: {
          bullStack,
          bearStack,
          longLook,
          shortLook,
          longTrig,
          shortTrig,
        },
      };
    }
    
    return null;
  }
  
  private checkV2System(
    price: number,
    emaFast: number,
    emaMid: number,
    emaSlow: number,
    rsi: number | null,
    volume: number,
    barOpen: number,
    barClose: number
  ): StrategySignal | null {
    if (rsi === null || this.v2RsiHistory.length < 2) return null;
    
    // V2: RSI surge + volume spike + volume color + EMA direction
    const rsiMomentum = this.v2RsiHistory[this.v2RsiHistory.length - 1] - this.v2RsiHistory[0];
    const rsiSurge = Math.abs(rsiMomentum) >= this.config.v2.rsiMomentumThreshold;
    
    // Calculate average volume
    const avgVolume = this.volumeHistory.reduce((sum, v) => sum + v, 0) / this.volumeHistory.length;
    const volumeSpike = volume >= avgVolume * this.config.v2.volumeMultiplier;
    
    // Volume color (green = bullish, red = bearish) - using bar close vs open
    // Green volume = close > open (bullish), Red volume = close < open (bearish)
    const volumeColor = barClose > barOpen;
    
    // EMA direction
    const emaBullish = emaFast > emaMid && emaMid > emaSlow;
    const emaBearish = emaFast < emaMid && emaMid < emaSlow;
    
    // Long signal: RSI surge up + volume spike + green volume + bullish EMA
    if (rsiSurge && rsiMomentum > 0 && volumeSpike && volumeColor && emaBullish) {
      return {
        type: "long",
        reason: "v2-long",
        system: "v2",
        indicators: {
          emaFast,
          emaMid,
          emaSlow,
          rsi,
        },
        trend: {
          bullStack: emaBullish,
          bearStack: emaBearish,
          longLook: true,
          shortLook: false,
          longTrig: true,
          shortTrig: false,
        },
      };
    }
    
    // Short signal: RSI surge down + volume spike + red volume + bearish EMA
    if (rsiSurge && rsiMomentum < 0 && volumeSpike && !volumeColor && emaBearish) {
      return {
        type: "short",
        reason: "v2-short",
        system: "v2",
        indicators: {
          emaFast,
          emaMid,
          emaSlow,
          rsi,
        },
        trend: {
          bullStack: emaBullish,
          bearStack: emaBearish,
          longLook: false,
          shortLook: true,
          longTrig: false,
          shortTrig: true,
        },
      };
    }
    
    return null;
  }
  
  // Update position state for exit logic
  setPosition(side: "long" | "short" | "flat"): void {
    this.position = { side };
  }

  // Check exit conditions
  checkExitConditions(bar: SyntheticBar): {
    shouldExit: boolean;
    reason: string;
    details?: Record<string, unknown>;
  } {
    if (!this.position || this.position.side === "flat") {
      return { shouldExit: false, reason: "" };
    }

    const volume = bar.volume;
    const avgVolume = this.volumeHistory.length > 0 ? this.volumeHistory.reduce((sum, v) => sum + v, 0) / this.volumeHistory.length : volume;

    // Check RSI flattening with volume drop
    if (this.v2RsiHistory.length >= 3) {
      // Use last 3 RSI values for more stable momentum calculation
      const recentRSI = this.v2RsiHistory.slice(-3);
      const rsiMomentum = Math.abs(recentRSI[recentRSI.length - 1] - recentRSI[0]);
      const volumeMultiplier = avgVolume > 0 ? volume / avgVolume : 1;

      // More sophisticated exit conditions
      const rsiFlattening = rsiMomentum < 2.0; // Increased threshold for stability
      const volumeDrop = volumeMultiplier < this.config.v2.exitVolumeMultiplier;

      // Additional condition: check if RSI is moving against position (adverse movement)
      let adverseRSI = false;
      if (this.position.side === "long" && recentRSI[recentRSI.length - 1] < recentRSI[0]) {
        adverseRSI = true;
      } else if (this.position.side === "short" && recentRSI[recentRSI.length - 1] > recentRSI[0]) {
        adverseRSI = true;
      }

      if ((rsiFlattening && volumeDrop) || adverseRSI) {
        return {
          shouldExit: true,
          reason: adverseRSI ? "rsi-reversal" : "rsi-flattening-volume-drop",
          details: {
            rsiMomentum,
            volume,
            avgVolume,
            volumeMultiplier,
            recentRSI,
            adverseRSI,
            position: this.position.side,
          },
        };
      }
    }

    return { shouldExit: false, reason: "" };
  }
  
  get settings(): PeachConfig {
    return this.config;
  }
  
  getIndicatorValues(): {
    v1: { emaFast: number | null; emaMid: number | null; emaSlow: number | null; rsi: number | null };
    v2: { emaFast: number | null; emaMid: number | null; emaSlow: number | null; rsi: number | null };
    adx: number | null;
  } {
    return {
      v1: {
        emaFast: this.v1EmaFast.value,
        emaMid: this.v1EmaMid.value,
        emaSlow: this.v1EmaSlow.value,
        rsi: this.v1Rsi.value,
      },
      v2: {
        emaFast: this.v2EmaFast.value,
        emaMid: this.v2EmaMid.value,
        emaSlow: this.v2EmaSlow.value,
        rsi: this.v2Rsi.value,
      },
      adx: this.adx.value,
    };
  }

  // Check if market regime allows trading
  shouldAllowTrading(adxThreshold: number = 25): boolean {
    // If ADX is not ready yet, allow trading (give it time to warm up)
    // Once ADX is ready, check if market is trending
    return !this.adx.isReady || this.adx.isTrending(adxThreshold);
  }
}

