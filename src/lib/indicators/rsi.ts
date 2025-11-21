export class RSI {
  private avgGain = 0;
  private avgLoss = 0;
  private prevValue: number | null = null;
  private readonly length: number;
  private readonly alpha: number;
  private ready = false;
  private rsiValue: number | null = null;
  private updateCount = 0;

  constructor(length: number) {
    if (length < 2) {
      throw new Error("RSI length must be at least 2");
    }
    this.length = length;
    this.alpha = 1 / length;
  }

  update(value: number): number {
    if (this.prevValue === null) {
      this.prevValue = value;
      this.rsiValue = 50;
      this.updateCount = 1;
      return 50;
    }

    const delta = value - this.prevValue;
    const gain = Math.max(delta, 0);
    const loss = Math.max(-delta, 0);

    this.updateCount++;

    // For initial period, use simple average
    if (this.updateCount <= this.length) {
      this.avgGain = (this.avgGain * (this.updateCount - 1) + gain) / this.updateCount;
      this.avgLoss = (this.avgLoss * (this.updateCount - 1) + loss) / this.updateCount;
    } else {
      // After initial period, use exponential moving average
      this.avgGain = this.avgGain * (1 - this.alpha) + gain * this.alpha;
      this.avgLoss = this.avgLoss * (1 - this.alpha) + loss * this.alpha;
    }

    this.prevValue = value;

    if (!this.ready && this.updateCount >= this.length) {
      this.ready = true;
    }

    // Handle edge cases
    if (this.avgLoss === 0) {
      this.rsiValue = this.avgGain > 0 ? 100 : 50; // If no losses, RSI = 100; if no gains/losses, RSI = 50
      return this.rsiValue;
    }

    if (this.avgGain === 0) {
      this.rsiValue = 0; // If no gains, RSI = 0
      return this.rsiValue;
    }

    const rs = this.avgGain / this.avgLoss;
    this.rsiValue = 100 - 100 / (1 + rs);
    return this.rsiValue;
  }

  get isReady(): boolean {
    return this.ready;
  }

  get value(): number | null {
    return this.rsiValue;
  }
}

