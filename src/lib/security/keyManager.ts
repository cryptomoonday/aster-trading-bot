/**
 * Key Manager - Ensures API keys and private keys are never logged
 * All key-related operations should go through this manager
 */

export class KeyManager {
  private static readonly REDACTED = "***REDACTED***";

  static redactKey(key: string): string {
    if (!key || key.length < 8) {
      return this.REDACTED;
    }
    return `${key.substring(0, 4)}${this.REDACTED}${key.substring(key.length - 4)}`;
  }

  static redactCredentials(credentials: {
    apiKey?: string;
    apiSecret?: string;
    privateKey?: string;
    [key: string]: unknown;
  }): Record<string, unknown> {
    const redacted = { ...credentials };
    if (redacted.apiKey) {
      redacted.apiKey = this.redactKey(redacted.apiKey as string);
    }
    if (redacted.apiSecret) {
      redacted.apiSecret = this.redactKey(redacted.apiSecret as string);
    }
    if (redacted.privateKey) {
      redacted.privateKey = this.REDACTED;
    }
    return redacted;
  }

  static safeLog(message: string, data?: Record<string, unknown>): void {
    if (data) {
      const safeData = { ...data };
      // Redact any key-like fields
      Object.keys(safeData).forEach((key) => {
        const value = safeData[key];
        if (typeof value === "string" && (key.toLowerCase().includes("key") || key.toLowerCase().includes("secret"))) {
          safeData[key] = this.redactKey(value);
        }
      });
      console.log(message, safeData);
    } else {
      console.log(message);
    }
  }
}

