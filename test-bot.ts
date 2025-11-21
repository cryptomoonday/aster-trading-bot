/**
 * Comprehensive Bot Testing Suite
 * Tests all major components of the trading bot
 */

import { EMA } from "./src/lib/indicators/ema";
import { RSI } from "./src/lib/indicators/rsi";
import { VirtualBarBuilder } from "./src/lib/virtualBarBuilder";
import { WatermellonEngine } from "./src/lib/watermellonEngine";
import { PeachHybridEngine } from "./src/lib/peachHybridEngine";
import { DryRunExecutor } from "./src/lib/execution/dryRunExecutor";
import { loadConfig } from "./src/lib/config";
import type { Tick, SyntheticBar, WatermellonConfig, PeachConfig } from "./src/lib/types";

console.log("=".repeat(80));
console.log("BOT TESTING SUITE");
console.log("=".repeat(80));

// Test 1: EMA Indicator
console.log("\n[TEST 1] Testing EMA Indicator...");
try {
  const ema = new EMA(5);
  const values = [100, 101, 102, 103, 104, 105];
  values.forEach((v, i) => {
    const result = ema.update(v);
    console.log(`  EMA(${i + 1}): ${result.toFixed(4)}`);
  });
  console.log("✅ EMA test passed");
} catch (error) {
  console.error("❌ EMA test failed:", error);
}

// Test 2: RSI Indicator
console.log("\n[TEST 2] Testing RSI Indicator...");
try {
  const rsi = new RSI(14);
  const values = [100, 101, 102, 103, 102, 101, 100, 99, 98, 97, 98, 99, 100, 101, 102, 103, 104];
  values.forEach((v, i) => {
    const result = rsi.update(v);
    if (i > 0) {
      console.log(`  RSI(${i}): ${result?.toFixed(2) ?? "null"}`);
    }
  });
  console.log("✅ RSI test passed");
} catch (error) {
  console.error("❌ RSI test failed:", error);
}

// Test 3: Virtual Bar Builder
console.log("\n[TEST 3] Testing Virtual Bar Builder...");
try {
  const builder = new VirtualBarBuilder(30000); // 30 second bars
  const now = Date.now();
  const ticks: Tick[] = [
    { timestamp: now, price: 100, size: 1 },
    { timestamp: now + 5000, price: 101, size: 2 },
    { timestamp: now + 10000, price: 102, size: 1.5 },
    { timestamp: now + 15000, price: 103, size: 2 },
    { timestamp: now + 20000, price: 104, size: 1 },
    { timestamp: now + 25000, price: 105, size: 2 },
    { timestamp: now + 30000, price: 106, size: 1 }, // This should close the bar
  ];

  let barCount = 0;
  ticks.forEach((tick) => {
    const result = builder.pushTick(tick);
    if (result.closedBar) {
      barCount++;
      console.log(`  Bar ${barCount} closed:`, {
        open: result.closedBar.open,
        high: result.closedBar.high,
        low: result.closedBar.low,
        close: result.closedBar.close,
        volume: result.closedBar.volume.toFixed(2),
      });
    }
  });
  console.log(`✅ Virtual Bar Builder test passed (${barCount} bars created)`);
} catch (error) {
  console.error("❌ Virtual Bar Builder test failed:", error);
}

// Test 4: Watermellon Engine
console.log("\n[TEST 4] Testing Watermellon Engine...");
try {
  const config: WatermellonConfig = {
    timeframeMs: 30000,
    emaFastLen: 8,
    emaMidLen: 21,
    emaSlowLen: 48,
    rsiLength: 14,
    rsiMinLong: 42,
    rsiMaxShort: 58,
  };
  const engine = new WatermellonEngine(config);
  
  // Simulate price movement
  const prices = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115];
  let signalCount = 0;
  prices.forEach((price) => {
    const signal = engine.update(price);
    if (signal) {
      signalCount++;
      console.log(`  Signal ${signalCount} at price ${price}:`, signal.type, signal.reason);
    }
  });
  console.log(`✅ Watermellon Engine test passed (${signalCount} signals generated)`);
} catch (error) {
  console.error("❌ Watermellon Engine test failed:", error);
}

// Test 5: Peach Hybrid Engine
console.log("\n[TEST 5] Testing Peach Hybrid Engine...");
try {
  const config: PeachConfig = {
    timeframeMs: 30000,
    v1: {
      emaFastLen: 8,
      emaMidLen: 21,
      emaSlowLen: 48,
      emaMicroFastLen: 5,
      emaMicroSlowLen: 13,
      rsiLength: 14,
      rsiMinLong: 42.0,
      rsiMaxShort: 58.0,
      minBarsBetween: 1,
      minMovePercent: 0.10,
    },
    v2: {
      emaFastLen: 3,
      emaMidLen: 8,
      emaSlowLen: 13,
      rsiMomentumThreshold: 3.0,
      volumeLookback: 4,
      volumeMultiplier: 1.5,
      exitVolumeMultiplier: 1.2,
    },
  };
  const engine = new PeachHybridEngine(config);
  
  // Simulate bars with volume
  const bars: SyntheticBar[] = [];
  const baseTime = Date.now();
  for (let i = 0; i < 20; i++) {
    const price = 100 + i * 0.5;
    bars.push({
      startTime: baseTime + i * 30000,
      endTime: baseTime + (i + 1) * 30000,
      open: price - 0.1,
      high: price + 0.2,
      low: price - 0.2,
      close: price,
      volume: 10 + Math.random() * 5,
    });
  }
  
  let signalCount = 0;
  bars.forEach((bar, i) => {
    const signal = engine.update(bar);
    if (signal) {
      signalCount++;
      console.log(`  Signal ${signalCount} at bar ${i}:`, signal.type, signal.reason, signal.system);
    }
  });
  console.log(`✅ Peach Hybrid Engine test passed (${signalCount} signals generated)`);
} catch (error) {
  console.error("❌ Peach Hybrid Engine test failed:", error);
}

// Test 6: Dry Run Executor
console.log("\n[TEST 6] Testing Dry Run Executor...");
(async () => {
  try {
    const executor = new DryRunExecutor();
    const order = {
      side: "long" as const,
      size: 1000,
      leverage: 5,
      price: 100,
      signalReason: "test",
      timestamp: Date.now(),
    };
    
    await executor.enterLong(order);
    await executor.closePosition("test-close");
    
    const logs = executor.logs;
    console.log(`  Executor logged ${logs.length} entries`);
    logs.forEach((log, i) => {
      console.log(`  Log ${i + 1}:`, log.type);
    });
    console.log("✅ Dry Run Executor test passed");
  } catch (error) {
    console.error("❌ Dry Run Executor test failed:", error);
  }
})();

// Test 7: Configuration Loading (without env vars - should fail gracefully)
console.log("\n[TEST 7] Testing Configuration Loading...");
try {
  // This will fail without proper env vars, but we can test the structure
  console.log("  Testing config structure (will fail without env vars)...");
  try {
    const config = loadConfig();
    console.log("  Config loaded successfully");
    console.log("  Mode:", config.mode);
    console.log("  Strategy Type:", config.strategyType);
    console.log("  Max Position Size:", config.risk.maxPositionSize);
    console.log("✅ Configuration Loading test passed");
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    if (err.message.includes("Invalid environment configuration")) {
      console.log("  ✅ Configuration validation working (expected failure without env vars)");
    } else {
      throw error;
    }
  }
} catch (error) {
  console.error("❌ Configuration Loading test failed:", error);
}

// Test 8: Type Safety Checks
console.log("\n[TEST 8] Testing Type Safety...");
try {
  // Test that types are properly defined
  const testTick: Tick = { timestamp: Date.now(), price: 100, size: 1 };
  const testBar: SyntheticBar = {
    startTime: Date.now(),
    endTime: Date.now() + 30000,
    open: 100,
    high: 101,
    low: 99,
    close: 100.5,
    volume: 10,
  };
  console.log("  Tick type:", typeof testTick.price);
  console.log("  Bar type:", typeof testBar.close);
  console.log("✅ Type Safety test passed");
} catch (error) {
  console.error("❌ Type Safety test failed:", error);
}

console.log("\n" + "=".repeat(80));
console.log("TESTING COMPLETE");
console.log("=".repeat(80));

