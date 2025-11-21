import type { ExecutionAdapter, TradeInstruction } from "../types";

type LogEntry =
  | { type: "enter"; side: "long" | "short"; order: TradeInstruction }
  | { type: "close"; reason: string; meta?: Record<string, unknown>; timestamp: number };

export class DryRunExecutor implements ExecutionAdapter {
  private readonly history: LogEntry[] = [];

  async enterLong(order: TradeInstruction): Promise<void> {
    this.persist({ type: "enter", side: "long", order });
  }

  async enterShort(order: TradeInstruction): Promise<void> {
    this.persist({ type: "enter", side: "short", order });
  }

  async closePosition(reason: string, meta?: Record<string, unknown>): Promise<void> {
    this.persist({ type: "close", reason, meta, timestamp: Date.now() });
  }

  get logs(): LogEntry[] {
    return this.history;
  }

  private persist(entry: LogEntry) {
    this.history.unshift(entry);
    const label = entry.type === "enter" ? `ENTER ${entry.side.toUpperCase()}` : "CLOSE";
    const payload = entry.type === "enter" ? entry.order : entry;
    console.log(`[DryRun] ${label}`, payload);
  }
}

