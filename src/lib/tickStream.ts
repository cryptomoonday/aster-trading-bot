import EventEmitter from "events";
import WebSocket from "ws";
import type { Tick } from "./types";

type TickEvents = {
  tick: (tick: Tick) => void;
  error: (error: Error) => void;
  close: () => void;
};

// AsterDEX WebSocket format: Based on reference code, uses Binance-compatible format
// Reference shows: wss://fstream.asterdex.com/ws with CCXT handling subscription
// For raw WebSocket, we need to match Binance futures stream format
const defaultSubscribePayload = (pair: string) => {
  // Convert ASTERUSDT-PERP to ASTERUSDT (remove -PERP suffix, uppercase)
  const streamName = pair.toUpperCase().replace(/-PERP$/, "");
  // Binance futures format: lowercase symbol@aggTrade
  return {
    method: "SUBSCRIBE",
    params: [`${streamName.toLowerCase()}@aggTrade`],
    id: 1,
  };
};

type MessageParser = (raw: WebSocket.RawData) => Tick[] | null;

const coerceNumber = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const defaultParser: MessageParser = (raw) => {
  try {
    const payload = JSON.parse(raw.toString());

    // AsterDEX WebSocket format: { stream: "asterusdtperp@aggTrade", data: { ... } }
    if (payload.stream && payload.data) {
      const trade = payload.data;
      // AsterDEX format: { e: "aggTrade", p: "price", q: "quantity", T: timestamp, ... }
      const price = coerceNumber(trade.p);
      const size = coerceNumber(trade.q);
      const timestamp = coerceNumber(trade.T) ?? Date.now();

      if (price === null) return null;

      return [{ price, size: size ?? 0, timestamp }];
    }

    // Fallback: try to parse as direct trade object
    if (payload.p || payload.price) {
      const price = coerceNumber(payload.p) ?? coerceNumber(payload.price);
      const size = coerceNumber(payload.q) ?? coerceNumber(payload.quantity);
      const timestamp = coerceNumber(payload.T) ?? coerceNumber(payload.timestamp) ?? Date.now();

      if (price === null) return null;

      return [{ price, size: size ?? 0, timestamp }];
    }

    return null;
  } catch (error) {
    console.error("Failed to parse tick message", error);
    return null;
  }
};

export class AsterTickStream {
  private readonly emitter = new EventEmitter();
  private ws: WebSocket | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastMessageTime = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private readonly heartbeatIntervalMs = 10_000; // 10 seconds
  private readonly wsTimeoutMs = 5_000; // 5 seconds
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;

  constructor(
    private readonly url: string,
    private readonly pairSymbol: string,
    private readonly parser: MessageParser = defaultParser,
    private readonly subscribePayloadBuilder: (pair: string) => unknown = defaultSubscribePayload,
  ) {}

  async start(): Promise<void> {
    await this.stop();
    console.log(`[TickStream] Connecting to ${this.url}...`);
    // AsterDEX uses wss://fstream.asterdex.com/ws (reference code shows this)
    // Ensure we're using the correct base URL
    const wsUrl = this.url.endsWith("/ws") ? this.url : `${this.url}/ws`;
    this.ws = new WebSocket(wsUrl, {
      headers: {
        "User-Agent": "Watermellon-bot/0.1",
      },
    });

    this.ws.on("open", () => {
      console.log(`[TickStream] WebSocket connected to ${this.url}`);
      this.reconnectAttempts = 0;
      this.lastMessageTime = Date.now();
      this.startHeartbeat();
      const payload = this.subscribePayloadBuilder(this.pairSymbol);
      console.log(`[TickStream] Subscribing to:`, JSON.stringify(payload, null, 2));
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(payload));
      } else {
        console.error(`[TickStream] WebSocket not ready, state: ${this.ws?.readyState}`);
      }
    });

    this.ws.on("message", (raw) => {
      this.lastMessageTime = Date.now();
      const message = raw.toString();
      
      // Check if this is a subscription confirmation or ping response
      try {
        const parsed = JSON.parse(message);
        if (parsed.result === null || parsed.id) {
          console.log(`[TickStream] Subscription confirmed`);
          return;
        }
        if (parsed.error) {
          console.error(`[TickStream] Subscription error:`, parsed.error);
          return;
        }
        // Handle ping/pong
        if (parsed.ping || parsed.pong) {
          return;
        }
      } catch {
        // Not JSON, continue to parse as trade data
      }
      
      const ticks = this.parser(raw);
      if (!ticks || ticks.length === 0) {
        return;
      }
      ticks.forEach((tick) => {
        this.emitter.emit("tick", tick);
      });
    });

    this.ws.on("error", (err) => {
      console.error(`[TickStream] WebSocket error:`, err);
      this.emitter.emit("error", err as Error);
    });

    this.ws.on("close", (code, reason) => {
      console.log(`[TickStream] WebSocket closed: code=${code}, reason=${reason.toString()}`);
      this.stopHeartbeat();
      this.scheduleReconnect();
      this.emitter.emit("close");
    });
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Send ping
        this.ws.ping();
        // Check if we've received messages recently
        const timeSinceLastMessage = Date.now() - this.lastMessageTime;
        if (timeSinceLastMessage > this.wsTimeoutMs) {
          console.warn(`[TickStream] No messages for ${timeSinceLastMessage}ms, reconnecting...`);
          this.reconnect();
        }
      }
    }, this.heartbeatIntervalMs);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      return;
    }
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`[TickStream] Max reconnect attempts reached`);
      return;
    }
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    console.log(`[TickStream] Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.reconnect();
    }, delay);
  }

  private async reconnect(): Promise<void> {
    this.reconnectAttempts++;
    console.log(`[TickStream] Reconnecting... (attempt ${this.reconnectAttempts})`);
    await this.stop();
    await this.start();
  }

  async stop(): Promise<void> {
    this.stopHeartbeat();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    await new Promise<void>((resolve) => {
      if (!this.ws) {
        return resolve();
      }
      this.ws.once("close", () => resolve());
      this.ws.close();
      this.ws = null;
    });
  }

  on<K extends keyof TickEvents>(event: K, handler: TickEvents[K]): () => void {
    this.emitter.on(event, handler as (...args: unknown[]) => void);
    return () => this.emitter.off(event, handler as (...args: unknown[]) => void);
  }
}

