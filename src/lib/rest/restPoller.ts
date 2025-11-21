import type { Credentials } from "../types";
import crypto from "crypto";

type AsterPositionResponse = {
  positionAmt: string;
  entryPrice: string;
  markPrice: string;
  unRealizedProfit: string;
  liquidationPrice: string;
  leverage: string;
  marginType: string;
  isolatedMargin: string;
  positionSide: string;
  symbol: string;
};

type AsterBalanceResponse = {
  asset: string;
  balance: string;
  availableBalance: string;
  maxWithdrawAmount: string;
};

export class RestPoller {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly symbol: string;
  private intervalId: NodeJS.Timeout | null = null;
  private onPositionUpdate?: (position: AsterPositionResponse) => void;
  private onBalanceUpdate?: (balance: AsterBalanceResponse[]) => void;
  private onError?: (error: Error) => void;
  private lastSuccessLog: number = 0;

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

  start(intervalMs: number = 2000): void {
    this.stop();
    this.intervalId = setInterval(() => {
      this.poll();
    }, intervalMs);
    // Poll immediately
    this.poll();
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  on(event: "position", handler: (position: AsterPositionResponse) => void): void;
  on(event: "balance", handler: (balance: AsterBalanceResponse[]) => void): void;
  on(event: "error", handler: (error: Error) => void): void;
  on(event: string, handler: unknown): void {
    if (event === "position") {
      this.onPositionUpdate = handler as (position: AsterPositionResponse) => void;
    } else if (event === "balance") {
      this.onBalanceUpdate = handler as (balance: AsterBalanceResponse[]) => void;
    } else if (event === "error") {
      this.onError = handler as (error: Error) => void;
    }
  }

  private async poll(): Promise<void> {
    try {
      // Fetch position and balance in parallel
      await Promise.all([
        this.fetchPosition().catch((err) => {
          console.error(`[RestPoller] Position fetch error:`, err);
          throw err;
        }),
        this.fetchBalance().catch((err) => {
          console.error(`[RestPoller] Balance fetch error:`, err.message);
          throw err;
        }),
      ]);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`[RestPoller] Poll error:`, err);
      this.onError?.(err);
    }
  }

  private async fetchPosition(): Promise<void> {
    // Use /fapi/v2/account endpoint like the reference code (more reliable)
    // Reference code shows: asterPrivate.fapiPrivateV2GetAccount()
    try {
      // Account endpoint returns all positions in account.positions array
      const account = await this.signedRequest<{ positions: AsterPositionResponse[] }>("GET", "/fapi/v2/account", new URLSearchParams());
      const pos = account.positions?.find((p) => p.symbol === this.symbol);
      // Always send position update, even if flat (0), so reconciliation can work
      if (pos) {
        this.onPositionUpdate?.(pos);
      } else {
        // If position not found, send flat position update
        this.onPositionUpdate?.({
          positionAmt: "0",
          entryPrice: "0",
          markPrice: "0",
          unRealizedProfit: "0",
          liquidationPrice: "0",
          leverage: "1",
          marginType: "cross",
          isolatedMargin: "0",
          positionSide: "BOTH",
          symbol: this.symbol,
        });
      }
      // Log successful poll (only once per minute to avoid spam)
      const now = Date.now();
      if (!this.lastSuccessLog || now - this.lastSuccessLog > 60000) {
        console.log(`[RestPoller] Position poll successful (symbol: ${this.symbol}, position: ${pos?.positionAmt || "0"})`);
        this.lastSuccessLog = now;
      }
    } catch (error) {
      // Fallback to positionRisk endpoint if account endpoint fails
      const err = error instanceof Error ? error : new Error(String(error));
      console.warn(`[RestPoller] Account endpoint failed, trying fallback: ${err.message}`);
      try {
        const params = new URLSearchParams({
          symbol: this.symbol,
        });
        const position = await this.signedRequest<AsterPositionResponse[]>("GET", "/fapi/v2/positionRisk", params);
        const pos = position.find((p) => p.symbol === this.symbol);
        // Always send position update, even if flat (0), so reconciliation can work
        if (pos) {
          this.onPositionUpdate?.(pos);
        } else {
          // If position not found, send flat position update
          this.onPositionUpdate?.({
            positionAmt: "0",
            entryPrice: "0",
            markPrice: "0",
            unRealizedProfit: "0",
            liquidationPrice: "0",
            leverage: "1",
            marginType: "cross",
            isolatedMargin: "0",
            positionSide: "BOTH",
            symbol: this.symbol,
          });
        }
      } catch (fallbackError) {
        const fallbackErr = fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError));
        console.error(`[RestPoller] Both endpoints failed: ${fallbackErr.message}`);
        this.onError?.(fallbackErr);
      }
    }
  }

  private async fetchBalance(): Promise<void> {
    try {
      // According to AsterDEX API docs: GET /fapi/v2/balance (Futures Account Balance V2)
      // This endpoint requires USER_DATA permissions
      const params = new URLSearchParams();
      const balance = await this.signedRequest<AsterBalanceResponse[]>("GET", "/fapi/v2/balance", params);
      
      if (!Array.isArray(balance)) {
        console.error(`[RestPoller] Balance response is not an array:`, typeof balance);
        throw new Error("Balance response is not an array");
      }
      
      if (!Array.isArray(balance) || balance.length === 0) {
        console.warn(`[RestPoller] Balance response is empty or invalid`);
        return;
      }
      
      if (this.onBalanceUpdate) {
        this.onBalanceUpdate(balance);
      } else {
        console.error(`[RestPoller] onBalanceUpdate handler is not set!`);
      }
    } catch (error) {
      // Fallback: try to get balance from /fapi/v2/account endpoint
      const err = error instanceof Error ? error : new Error(String(error));
      console.warn(`[RestPoller] Balance endpoint (/fapi/v2/balance) failed: ${err.message}`);
      console.warn(`[RestPoller] Error details:`, err);
      
      try {
        const accountParams = new URLSearchParams();
        console.log(`[RestPoller] Trying fallback: fetching from /fapi/v2/account...`);
        const account = await this.signedRequest<{ 
          assets?: Array<{ 
            asset: string; 
            availableBalance: string; 
            balance: string;
            walletBalance?: string;
          }>;
          totalWalletBalance?: string;
        }>("GET", "/fapi/v2/account", accountParams);
        
        console.log(`[RestPoller] Account response received`);
        console.log(`[RestPoller] DEBUG - Account response keys:`, Object.keys(account));
        console.log(`[RestPoller] DEBUG - Account response structure (first 500 chars):`, JSON.stringify(account).substring(0, 500));
        
        if (account.assets && Array.isArray(account.assets)) {
          console.log(`[RestPoller] Found ${account.assets.length} assets in account response`);
          
          // DEBUG: Log first asset structure
          if (account.assets.length > 0) {
            console.log(`[RestPoller] DEBUG - First account asset structure:`, JSON.stringify(account.assets[0], null, 2));
          }
          
          // Convert account assets format to balance format
          type AccountAsset = { asset: string; availableBalance?: string; balance?: string; walletBalance?: string };
          const balances: AsterBalanceResponse[] = account.assets.map((asset: AccountAsset) => ({
            asset: asset.asset,
            balance: asset.balance || asset.walletBalance || "0",
            availableBalance: asset.availableBalance || asset.balance || asset.walletBalance || "0",
            maxWithdrawAmount: asset.availableBalance || asset.balance || asset.walletBalance || "0",
          }));
          console.log(`[RestPoller] Converted ${balances.length} balances from account endpoint`);
          
          // DEBUG: Log USDT from converted balances
          const usdtConverted = balances.find((b) => b.asset?.toUpperCase() === "USDT");
          if (usdtConverted) {
            console.log(`[RestPoller] DEBUG - Converted USDT balance:`, JSON.stringify(usdtConverted, null, 2));
          }
          
          this.onBalanceUpdate?.(balances);
        } else {
          console.warn(`[RestPoller] Account response does not contain assets array. Response keys:`, Object.keys(account));
          // Try to extract balance from account response if it's in a different format
          if (account.totalWalletBalance) {
            console.log(`[RestPoller] Found totalWalletBalance: ${account.totalWalletBalance}`);
          }
        }
      } catch (fallbackError) {
        const fallbackErr = fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError));
        console.error(`[RestPoller] Both balance endpoints failed:`);
        console.error(`[RestPoller] Primary error: ${err.message}`);
        console.error(`[RestPoller] Primary error stack:`, err.stack);
        console.error(`[RestPoller] Fallback error: ${fallbackErr.message}`);
        console.error(`[RestPoller] Fallback error stack:`, fallbackErr.stack);
        this.onError?.(fallbackErr);
      }
    }
  }

  private async signedRequest<T>(method: "GET" | "POST", endpoint: string, params: URLSearchParams): Promise<T> {
    const timestamp = Date.now();
    params.append("timestamp", timestamp.toString());

    const queryString = params.toString();
    const signature = crypto.createHmac("sha256", this.apiSecret).update(queryString).digest("hex");

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
        try {
          const error = await response.json();
          errorMsg = `AsterDEX REST error: ${error.code || response.status} - ${error.msg || response.statusText}`;
        } catch {
          // If JSON parsing fails, use the response text
          const text = await response.text();
          errorMsg = `AsterDEX REST error: ${response.status} - ${text || response.statusText}`;
        }
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
}

