import crypto from "crypto";
import type { Credentials, ExecutionAdapter, TradeInstruction } from "../types";

type AsterOrderResponse = {
  orderId: number;
  symbol: string;
  status: string;
  clientOrderId: string;
  price: string;
  avgPrice: string;
  origQty: string;
  executedQty: string;
  cumQuote: string;
  timeInForce: string;
  type: string;
  reduceOnly: boolean;
  closePosition: boolean;
  side: string;
  positionSide: string;
  stopPrice: string;
  workingType: string;
  priceProtect: boolean;
  origType: string;
  time: number;
  updateTime: number;
};

type AsterErrorResponse = {
  code: number;
  msg: string;
};

export class LiveExecutor implements ExecutionAdapter {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly symbol: string;

  constructor(credentials: Credentials) {
    this.baseUrl = credentials.rpcUrl;
    this.apiKey = credentials.apiKey;
    this.apiSecret = credentials.apiSecret;
    // Normalize symbol: remove -PERP suffix and convert to uppercase for REST API
    this.symbol = this.normalizeSymbol(credentials.pairSymbol);
  }

  private normalizeSymbol(symbol: string): string {
    // AsterDEX REST API expects ASTERUSDT (not ASTERUSDT-PERP)
    return symbol.toUpperCase().replace(/-PERP$/, "");
  }

  async enterLong(order: TradeInstruction): Promise<void> {
    await this.setLeverage(order.leverage);
    // Try without positionSide first (one-way mode), fallback to hedge mode if needed
    try {
      await this.placeOrder({
        side: "BUY",
        type: "MARKET",
        quantity: order.size,
      });
    } catch (error) {
      // If one-way mode fails, try with positionSide (hedge mode)
      const err = error instanceof Error ? error.message : String(error);
      if (err.includes("position side")) {
        await this.placeOrder({
          side: "BUY",
          type: "MARKET",
          quantity: order.size,
          positionSide: "LONG",
        });
      } else {
        throw error;
      }
    }
    console.log(`[LiveExecutor] Entered LONG position: ${order.size} @ ${order.price}`);
  }

  async enterShort(order: TradeInstruction): Promise<void> {
    await this.setLeverage(order.leverage);
    // Try without positionSide first (one-way mode), fallback to hedge mode if needed
    try {
      await this.placeOrder({
        side: "SELL",
        type: "MARKET",
        quantity: order.size,
      });
    } catch (error) {
      // If one-way mode fails, try with positionSide (hedge mode)
      const err = error instanceof Error ? error.message : String(error);
      if (err.includes("position side")) {
        await this.placeOrder({
          side: "SELL",
          type: "MARKET",
          quantity: order.size,
          positionSide: "SHORT",
        });
      } else {
        throw error;
      }
    }
    console.log(`[LiveExecutor] Entered SHORT position: ${order.size} @ ${order.price}`);
  }

  async closePosition(reason: string, meta?: Record<string, unknown>): Promise<void> {
    try {
      const position = await this.getCurrentPosition();
      if (!position || position.positionAmt === "0") {
        console.log("[LiveExecutor] No position to close");
        return;
      }

      const positionAmt = parseFloat(position.positionAmt);
      if (positionAmt === 0) {
        console.log("[LiveExecutor] Position amount is zero");
        return;
      }

      // Determine side: positive = long (need to sell), negative = short (need to buy)
      const side = positionAmt > 0 ? "SELL" : "BUY";
      const quantity = Math.abs(positionAmt);

      // Try without positionSide first (one-way mode), fallback to hedge mode if needed
      try {
        await this.placeOrder({
          side,
          type: "MARKET",
          quantity,
          reduceOnly: true,
        });
      } catch (error) {
        // If one-way mode fails, try with positionSide (hedge mode)
        const err = error instanceof Error ? error.message : String(error);
        if (err.includes("position side")) {
          const positionSide = positionAmt > 0 ? "LONG" : "SHORT";
          await this.placeOrder({
            side,
            type: "MARKET",
            quantity,
            positionSide,
            reduceOnly: true,
          });
        } else {
          throw error;
        }
      }

      console.log(`[LiveExecutor] Closed position: ${reason}`, { positionAmt, side, quantity, ...meta });
    } catch (error) {
      console.error(`[LiveExecutor] Failed to close position: ${reason}`, error);
      throw error;
    }
  }

  private async setLeverage(leverage: number): Promise<void> {
    const params = new URLSearchParams({
      symbol: this.symbol,
      leverage: leverage.toString(),
    });

    await this.signedRequest("POST", "/fapi/v1/leverage", params);
  }

  private async placeOrder(params: {
    side: "BUY" | "SELL";
    type: string;
    quantity: number;
    positionSide?: string;
    reduceOnly?: boolean;
    price?: number;
  }): Promise<AsterOrderResponse> {
    const orderParams = new URLSearchParams({
      symbol: this.symbol,
      side: params.side,
      type: params.type,
      quantity: params.quantity.toString(),
    });

    if (params.positionSide) {
      orderParams.append("positionSide", params.positionSide);
    }
    if (params.reduceOnly) {
      orderParams.append("reduceOnly", "true");
    }
    if (params.price) {
      orderParams.append("price", params.price.toString());
    }

    const response = await this.signedRequest<AsterOrderResponse>("POST", "/fapi/v1/order", orderParams);
    return response;
  }

  private async getCurrentPosition(): Promise<{ positionAmt: string; symbol: string; entryPrice?: string } | null> {
    try {
      // Use /fapi/v2/account endpoint like reference code (more reliable)
      const account = await this.signedRequest<{ positions: Array<{ positionAmt: string; symbol: string; entryPrice?: string }> }>(
        "GET",
        "/fapi/v2/account",
        new URLSearchParams(),
      );
      const position = account.positions?.find((p) => p.symbol === this.symbol);
      if (position && position.positionAmt !== "0") {
        return position;
      }
      return null;
    } catch {
      // Fallback to positionRisk endpoint
      try {
        const params = new URLSearchParams({
          symbol: this.symbol,
        });
        const positions = await this.signedRequest<Array<{ positionAmt: string; symbol: string }>>(
          "GET",
          "/fapi/v2/positionRisk",
          params,
        );
        const position = positions.find((p) => p.symbol === this.symbol);
        if (position && position.positionAmt !== "0") {
          return position;
        }
      } catch (fallbackError) {
        console.error("[LiveExecutor] Failed to get position", fallbackError);
      }
      return null;
    }
  }

  private async signedRequest<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    endpoint: string,
    params: URLSearchParams,
  ): Promise<T> {
    const timestamp = Date.now();
    params.append("timestamp", timestamp.toString());

    const queryString = params.toString();
    const signature = this.generateSignature(queryString);

    const url = `${this.baseUrl}${endpoint}?${queryString}&signature=${signature}`;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "X-MBX-APIKEY": this.apiKey,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        let errorMsg = `HTTP ${response.status}: ${response.statusText}`;
        let errorCode: number | undefined;
        try {
          const error: AsterErrorResponse = await response.json();
          errorCode = error.code;
          errorMsg = `AsterDEX API error: ${error.code || response.status} - ${error.msg || response.statusText}`;
        } catch {
          // If JSON parsing fails, use the response text
          const text = await response.text();
          errorMsg = `AsterDEX API error: ${response.status} - ${text || response.statusText}`;
        }
        
        // Check for insufficient balance errors (common error codes: -2019, -2010)
        if (errorCode === -2019 || errorCode === -2010 || errorMsg.toLowerCase().includes("balance") || errorMsg.toLowerCase().includes("insufficient")) {
          console.warn(`[LiveExecutor] Insufficient balance: ${errorMsg}`);
          throw new Error(`Insufficient balance: ${errorMsg}`);
        }
        
        console.error(`[LiveExecutor] API request failed: ${method} ${endpoint}`, { url, errorMsg });
        throw new Error(errorMsg);
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Network error: ${String(error)}`);
    }
  }

  private generateSignature(queryString: string): string {
    return crypto.createHmac("sha256", this.apiSecret).update(queryString).digest("hex");
  }
}

