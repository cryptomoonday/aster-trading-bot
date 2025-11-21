export class ADX {
  private readonly length: number;
  private trValues: number[] = [];
  private plusDMValues: number[] = [];
  private minusDMValues: number[] = [];
  private dxValues: number[] = [];
  private prevHigh: number | null = null;
  private prevLow: number | null = null;
  private prevClose: number | null = null;
  private prevATR: number | null = null;
  private prevPlusDI: number | null = null;
  private prevMinusDI: number | null = null;
  private adxValue: number | null = null;
  private updateCount = 0;

  constructor(length: number = 14) {
    if (length < 2) {
      throw new Error("ADX length must be at least 2");
    }
    this.length = length;
  }

  update(high: number, low: number, close: number): number | null {
    if (this.prevHigh === null || this.prevLow === null || this.prevClose === null) {
      this.prevHigh = high;
      this.prevLow = low;
      this.prevClose = close;
      return null;
    }

    this.updateCount++;

    // Calculate True Range
    const tr = Math.max(
      high - low,
      Math.abs(high - this.prevClose),
      Math.abs(low - this.prevClose)
    );

    // Calculate Directional Movement
    const plusDM = (high > this.prevHigh && low > this.prevLow)
      ? Math.max(high - this.prevHigh, 0)
      : 0;

    const minusDM = (this.prevHigh > high && this.prevLow > low)
      ? Math.max(this.prevLow - low, 0)
      : 0;

    // Store values for initial calculation
    this.trValues.push(tr);
    this.plusDMValues.push(plusDM);
    this.minusDMValues.push(minusDM);

    // Keep only enough history for initial calculation
    if (this.trValues.length > this.length) {
      this.trValues.shift();
      this.plusDMValues.shift();
      this.minusDMValues.shift();
    }

    // Need enough data for initial calculation
    if (this.updateCount < this.length + 1) {
      this.prevHigh = high;
      this.prevLow = low;
      this.prevClose = close;
      return null;
    }

    let atr: number;
    let plusDI: number;
    let minusDI: number;

    if (this.updateCount === this.length + 1) {
      // First calculation - use simple averages
      atr = this.trValues.reduce((sum, val) => sum + val, 0) / this.length;
      const avgPlusDM = this.plusDMValues.reduce((sum, val) => sum + val, 0) / this.length;
      const avgMinusDM = this.minusDMValues.reduce((sum, val) => sum + val, 0) / this.length;

      plusDI = avgPlusDM / atr * 100;
      minusDI = avgMinusDM / atr * 100;
    } else {
      // Subsequent calculations - use Wilder's smoothing
      const alpha = 1 / this.length;
      atr = this.prevATR! * (1 - alpha) + tr * alpha;
      const plusDM_smooth = this.prevPlusDI! / 100 * this.prevATR! * (1 - alpha) + plusDM * alpha;
      const minusDM_smooth = this.prevMinusDI! / 100 * this.prevATR! * (1 - alpha) + minusDM * alpha;

      plusDI = plusDM_smooth / atr * 100;
      minusDI = minusDM_smooth / atr * 100;
    }

    // Calculate DX
    const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;

    // Calculate ADX
    if (this.updateCount === this.length + 1) {
      // First ADX value - use simple average of first DX values
      this.dxValues.push(dx);
      if (this.dxValues.length >= this.length) {
        this.adxValue = this.dxValues.reduce((sum, val) => sum + val, 0) / this.dxValues.length;
      }
    } else if (this.adxValue !== null) {
      // Subsequent ADX values - use Wilder's smoothing
      const alpha = 1 / this.length;
      this.adxValue = this.adxValue * (1 - alpha) + dx * alpha;
    }

    // Store previous values
    this.prevATR = atr;
    this.prevPlusDI = plusDI;
    this.prevMinusDI = minusDI;

    this.prevHigh = high;
    this.prevLow = low;
    this.prevClose = close;

    return this.adxValue;
  }

  get value(): number | null {
    return this.adxValue;
  }

  get isReady(): boolean {
    return this.adxValue !== null;
  }

  // Helper to determine if market is trending
  isTrending(threshold: number = 25): boolean {
    return this.adxValue !== null && this.adxValue > threshold;
  }
}
