import type { TradeInstruction } from "../types";

type OrderConfirmation = {
  orderId: string;
  side: "long" | "short";
  size: number;
  price: number;
  timestamp: number;
  confirmed: boolean;
  confirmedAt?: number;
};

export class OrderTracker {
  private pendingOrders = new Map<string, OrderConfirmation>();
  private readonly confirmationTimeoutMs = 30_000; // 30 seconds

  trackOrder(order: TradeInstruction, orderId: string): void {
    this.pendingOrders.set(orderId, {
      orderId,
      side: order.side,
      size: order.size,
      price: order.price,
      timestamp: order.timestamp,
      confirmed: false,
    });

    // Auto-expire unconfirmed orders
    setTimeout(() => {
      const pending = this.pendingOrders.get(orderId);
      if (pending && !pending.confirmed) {
        console.warn(`[OrderTracker] Order ${orderId} not confirmed within timeout`);
        this.pendingOrders.delete(orderId);
      }
    }, this.confirmationTimeoutMs);
  }

  confirmOrder(orderId: string): boolean {
    const order = this.pendingOrders.get(orderId);
    if (order) {
      order.confirmed = true;
      order.confirmedAt = Date.now();
      console.log(`[OrderTracker] Order ${orderId} confirmed`);
      return true;
    }
    return false;
  }

  confirmByPositionChange(side: "long" | "short", size: number): void {
    // Find matching pending order
    for (const [orderId, order] of this.pendingOrders.entries()) {
      if (!order.confirmed && order.side === side && Math.abs(order.size - size) < 0.0001) {
        this.confirmOrder(orderId);
        break;
      }
    }
  }

  hasPendingOrders(): boolean {
    return this.pendingOrders.size > 0;
  }

  getPendingOrders(): OrderConfirmation[] {
    return Array.from(this.pendingOrders.values());
  }

  clearOrder(orderId: string): void {
    this.pendingOrders.delete(orderId);
  }

  clearAll(): void {
    this.pendingOrders.clear();
  }
}

