import type { SyntheticBar, Tick } from "./types";

export class VirtualBarBuilder {
  private bar: SyntheticBar | null = null;
  private readonly timeframeMs: number;

  constructor(timeframeMs: number) {
    if (timeframeMs <= 0) {
      throw new Error("Timeframe must be positive");
    }
    this.timeframeMs = timeframeMs;
  }

  pushTick(tick: Tick): { closedBar: SyntheticBar | null; currentBar: SyntheticBar } {
    if (!this.bar) {
      this.bar = this.createBar(tick);
      return { closedBar: null, currentBar: this.bar };
    }

    const elapsed = tick.timestamp - this.bar.startTime;
    if (elapsed >= this.timeframeMs) {
      const closedBar = this.bar;
      this.bar = this.createBar(tick);
      return { closedBar, currentBar: this.bar };
    }

    this.bar.high = Math.max(this.bar.high, tick.price);
    this.bar.low = Math.min(this.bar.low, tick.price);
    this.bar.close = tick.price;
    if (tick.size) {
      this.bar.volume += tick.size;
    }
    this.bar.endTime = tick.timestamp;

    return { closedBar: null, currentBar: this.bar };
  }

  private createBar(tick: Tick): SyntheticBar {
    return {
      startTime: tick.timestamp,
      endTime: tick.timestamp,
      open: tick.price,
      high: tick.price,
      low: tick.price,
      close: tick.price,
      volume: tick.size ?? 0,
    };
  }
}

