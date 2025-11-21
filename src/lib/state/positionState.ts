export type LocalPositionState = {
  size: number;
  side: "long" | "short" | "flat";
  avgEntry: number;
  unrealizedPnl: number;
  lastUpdate: number;
  orderId?: string;
  pendingOrder?: {
    side: "long" | "short";
    size: number;
    timestamp: number;
  };
};

export class PositionStateManager {
  private state: LocalPositionState = {
    size: 0,
    side: "flat",
    avgEntry: 0,
    unrealizedPnl: 0,
    lastUpdate: Date.now(),
  };

  private reconciliationFailures = 0;
  private readonly maxReconciliationFailures = 2;

  updateLocalState(update: Partial<LocalPositionState>): void {
    this.state = {
      ...this.state,
      ...update,
      lastUpdate: Date.now(),
    };
  }

  updateFromRest(restState: {
    positionAmt: string;
    entryPrice: string;
    unrealizedProfit: string;
  }): boolean {
    const size = parseFloat(restState.positionAmt);
    const side: "long" | "short" | "flat" = size > 0 ? "long" : size < 0 ? "short" : "flat";
    const avgEntry = parseFloat(restState.entryPrice) || 0;
    const unrealizedPnl = parseFloat(restState.unrealizedProfit) || 0;

    const restStateNormalized = {
      size: Math.abs(size),
      side,
      avgEntry,
      unrealizedPnl,
    };

    const localStateNormalized = {
      size: this.state.size,
      side: this.state.side,
      avgEntry: this.state.avgEntry,
      unrealizedPnl: this.state.unrealizedPnl,
    };

    const reconciled = this.reconcile(restStateNormalized, localStateNormalized);

    if (reconciled) {
      this.reconciliationFailures = 0;
      this.state = {
        ...this.state,
        ...restStateNormalized,
        lastUpdate: Date.now(),
      };
      return true;
    }

    // If REST says flat but local has a position, trust REST (position was closed externally)
    // This handles stale state from previous runs
    if (restStateNormalized.side === "flat" && localStateNormalized.side !== "flat") {
      console.log(`[PositionState] REST shows flat position, clearing local state (was ${localStateNormalized.side} ${localStateNormalized.size})`);
      this.reconciliationFailures = 0;
      this.state = {
        ...this.state,
        ...restStateNormalized,
        lastUpdate: Date.now(),
      };
      return true;
    }

    // If REST has a position but local is flat, trust REST (position exists on exchange)
    // This handles cases where bot restarted or position was opened externally
    if (restStateNormalized.side !== "flat" && localStateNormalized.side === "flat") {
      console.log(`[PositionState] REST shows ${restStateNormalized.side} position (${restStateNormalized.size}), updating local state from flat`);
      this.reconciliationFailures = 0;
      this.state = {
        ...this.state,
        ...restStateNormalized,
        lastUpdate: Date.now(),
      };
      return true;
    }

    this.reconciliationFailures++;
    return false;
  }

  private reconcile(
    rest: { size: number; side: "long" | "short" | "flat"; avgEntry: number; unrealizedPnl: number },
    local: { size: number; side: "long" | "short" | "flat"; avgEntry: number; unrealizedPnl: number },
  ): boolean {
    const sizeMatch = Math.abs(rest.size - local.size) < 0.0001;
    const sideMatch = rest.side === local.side;
    
    // If both are flat, entry price doesn't matter (should be 0 anyway)
    if (rest.side === "flat" && local.side === "flat") {
      return sizeMatch && sideMatch; // Only check size and side when both flat
    }
    
    // For non-flat positions, check entry price match
    const entryMatch = rest.avgEntry === 0 || Math.abs(rest.avgEntry - local.avgEntry) / rest.avgEntry < 0.01;

    return sizeMatch && sideMatch && entryMatch;
  }

  shouldFreezeTrading(): boolean {
    return this.reconciliationFailures >= this.maxReconciliationFailures;
  }

  resetReconciliationFailures(): void {
    this.reconciliationFailures = 0;
  }

  getState(): LocalPositionState {
    return { ...this.state };
  }

  clearPendingOrder(): void {
    this.state.pendingOrder = undefined;
  }

  setPendingOrder(order: { side: "long" | "short"; size: number; timestamp: number }): void {
    this.state.pendingOrder = order;
  }
}

