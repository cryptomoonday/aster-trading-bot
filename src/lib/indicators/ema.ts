export class EMA {
  private readonly smoothing: number;
  private readonly length: number;
  private initialized = false;
  private current = 0;

  constructor(length: number) {
    if (length <= 0) {
      throw new Error("EMA length must be positive");
    }
    this.length = length;
    this.smoothing = 2 / (length + 1);
  }

  update(value: number): number {
    if (!this.initialized) {
      this.current = value;
      this.initialized = true;
      return this.current;
    }

    this.current = value * this.smoothing + this.current * (1 - this.smoothing);
    return this.current;
  }

  get value(): number {
    if (!this.initialized) {
      throw new Error("EMA has not been initialized");
    }
    return this.current;
  }

  get isReady(): boolean {
    return this.initialized;
  }
}

