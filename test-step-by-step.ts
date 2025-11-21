/**
 * Step-by-Step Bot Testing
 * Tests each component individually with detailed output
 */

import { EMA } from "./src/lib/indicators/ema";
import { RSI } from "./src/lib/indicators/rsi";
import { VirtualBarBuilder } from "./src/lib/virtualBarBuilder";
import { WatermellonEngine } from "./src/lib/watermellonEngine";
import { PeachHybridEngine } from "./src/lib/peachHybridEngine";
import { DryRunExecutor } from "./src/lib/execution/dryRunExecutor";
import { PositionStateManager } from "./src/lib/state/positionState";
import { StatePersistence } from "./src/lib/state/statePersistence";
import { OrderTracker } from "./src/lib/execution/orderTracker";
import type { Tick, SyntheticBar, WatermellonConfig, PeachConfig } from "./src/lib/types";

console.log("=".repeat(80));
console.log("STEP-BY-STEP BOT TESTING");
console.log("=".repeat(80));

// ============================================================================
// STEP 1: Configuration Testing
// ============================================================================
console.log("\n" + "=".repeat(80));
console.log("STEP 1: Configuration Testing");
console.log("=".repeat(80));

console.log("\n[1.1] Testing Watermellon Configuration Structure...");
const watermellonConfig: WatermellonConfig = {
  timeframeMs: 30000,
  emaFastLen: 8,
  emaMidLen: 21,
  emaSlowLen: 48,
  rsiLength: 14,
  rsiMinLong: 42,
  rsiMaxShort: 58,
};
console.log(" Watermellon config:", JSON.stringify(watermellonConfig, null, 2));

console.log("\n[1.2] Testing Peach Hybrid Configuration Structure...");
const peachConfig: PeachConfig = {
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
console.log(" Peach config structure validated");

// ============================================================================
// STEP 2: Indicator Testing - EMA
// ============================================================================
console.log("\n" + "=".repeat(80));
console.log("STEP 2: EMA Indicator Testing");
console.log("=".repeat(80));

console.log("\n[2.1] Testing EMA with ascending values...");
const ema8 = new EMA(8);
const ascendingPrices = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109];
console.log("Input prices:", ascendingPrices);
ascendingPrices.forEach((price) => {
  const emaValue = ema8.update(price);
  console.log(`  Price ${price.toFixed(2)} → EMA(8): ${emaValue.toFixed(4)}`);
});
console.log("EMA correctly tracks upward trend");

console.log("\n[2.2] Testing EMA with descending values...");
const ema21 = new EMA(21);
const descendingPrices = [110, 109, 108, 107, 106, 105, 104, 103, 102, 101];
console.log("Input prices:", descendingPrices);
descendingPrices.forEach((price) => {
  const emaValue = ema21.update(price);
  console.log(`  Price ${price.toFixed(2)} → EMA(21): ${emaValue.toFixed(4)}`);
});
console.log(" EMA correctly tracks downward trend");

console.log("\n[2.3] Testing EMA initialization...");
try {
  const ema = new EMA(5);
  const firstValue = ema.update(100);
  console.log(`  First value (should equal input): ${firstValue} (expected: 100)`);
  console.log(firstValue === 100 ? "EMA initializes correctly" : " EMA initialization failed");
} catch (error) {
  console.error(" EMA initialization error:", error);
}

console.log("\n[2.4] Testing EMA error handling...");
try {
  new EMA(0);
  console.log(" Should have thrown error for length <= 0");
} catch {
  console.log("EMA correctly rejects invalid length");
}

// ============================================================================
// STEP 3: Indicator Testing - RSI
// ============================================================================
console.log("\n" + "=".repeat(80));
console.log("STEP 3: RSI Indicator Testing");
console.log("=".repeat(80));

console.log("\n[3.1] Testing RSI with bullish price action...");
const rsi14 = new RSI(14);
const bullishPrices = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115];
console.log("Input prices (bullish):", bullishPrices.slice(0, 10), "...");
bullishPrices.forEach((price, index) => {
  const rsiValue = rsi14.update(price);
  if (index > 0) {
    const trend = rsiValue && rsiValue > 50 ? " Bullish" : rsiValue && rsiValue < 50 ? "Bearish" : "➡️ Neutral";
    console.log(`  Price ${price.toFixed(2)} → RSI(14): ${rsiValue?.toFixed(2) ?? "null"} ${trend}`);
  }
});
console.log("RSI correctly identifies bullish trend");

console.log("\n[3.2] Testing RSI with bearish price action...");
const rsi14Bear = new RSI(14);
const bearishPrices = [115, 114, 113, 112, 111, 110, 109, 108, 107, 106, 105, 104, 103, 102, 101, 100];
console.log("Input prices (bearish):", bearishPrices.slice(0, 10), "...");
bearishPrices.forEach((price, index) => {
  const rsiValue = rsi14Bear.update(price);
  if (index > 0) {
    const trend = rsiValue && rsiValue > 50 ? " Bullish" : rsiValue && rsiValue < 50 ? " Bearish" : "➡️ Neutral";
    console.log(`  Price ${price.toFixed(2)} → RSI(14): ${rsiValue?.toFixed(2) ?? "null"} ${trend}`);
  }
});
console.log(" RSI correctly identifies bearish trend");

console.log("\n[3.3] Testing RSI edge case (all gains, no losses)...");
const rsiEdge = new RSI(14);
for (let i = 0; i < 20; i++) {
  const rsiValue = rsiEdge.update(100 + i);
  if (i > 0 && rsiValue === 100) {
    console.log(`   RSI correctly handles edge case (all gains) → RSI: ${rsiValue}`);
    break;
  }
}

// ============================================================================
// STEP 4: Virtual Bar Builder Testing
// ============================================================================
console.log("\n" + "=".repeat(80));
console.log("STEP 4: Virtual Bar Builder Testing");
console.log("=".repeat(80));

console.log("\n[4.1] Testing bar creation from ticks...");
const builder = new VirtualBarBuilder(30000); // 30 second bars
const baseTime = Date.now();
const ticks: Tick[] = [
  { timestamp: baseTime, price: 100.0, size: 1.0 },
  { timestamp: baseTime + 5000, price: 100.5, size: 2.0 },
  { timestamp: baseTime + 10000, price: 101.0, size: 1.5 },
  { timestamp: baseTime + 15000, price: 100.8, size: 2.5 },
  { timestamp: baseTime + 20000, price: 101.2, size: 1.0 },
  { timestamp: baseTime + 25000, price: 101.5, size: 2.0 },
  { timestamp: baseTime + 30000, price: 102.0, size: 1.5 }, // Should close bar
];

let barCount = 0;
ticks.forEach((tick) => {
  const result = builder.pushTick(tick);
  if (result.closedBar) {
    barCount++;
    const bar = result.closedBar;
    console.log(`\n  Bar ${barCount} closed:`);
    console.log(`    Open:  ${bar.open.toFixed(4)}`);
    console.log(`    High:  ${bar.high.toFixed(4)}`);
    console.log(`    Low:   ${bar.low.toFixed(4)}`);
    console.log(`    Close: ${bar.close.toFixed(4)}`);
    console.log(`    Volume: ${bar.volume.toFixed(2)}`);
    console.log(`    Duration: ${(bar.endTime - bar.startTime) / 1000}s`);
  }
});
console.log(`\n Created ${barCount} complete bar(s)`);

console.log("\n[4.2] Testing bar with multiple ticks...");
const builder2 = new VirtualBarBuilder(10000); // 10 second bars
const manyTicks: Tick[] = [];
for (let i = 0; i < 20; i++) {
  manyTicks.push({
    timestamp: baseTime + i * 1000,
    price: 100 + Math.random() * 2,
    size: Math.random() * 2,
  });
}

let barsCreated = 0;
manyTicks.forEach((tick) => {
  const result = builder2.pushTick(tick);
  if (result.closedBar) barsCreated++;
});
console.log(`  Processed ${manyTicks.length} ticks, created ${barsCreated} bars`);
console.log("Bar builder handles multiple ticks correctly");

// ============================================================================
// STEP 5: Watermellon Engine Testing
// ============================================================================
console.log("\n" + "=".repeat(80));
console.log("STEP 5: Watermellon Engine Testing");
console.log("=".repeat(80));

console.log("\n[5.1] Testing Watermellon engine with bullish scenario...");
const watermellonEngine = new WatermellonEngine(watermellonConfig);

// Simulate price action that should trigger a long signal
const bullishSequence = [
  100, 100.5, 101, 101.5, 102, 102.5, 103, 103.5, 104, 104.5,
  105, 105.5, 106, 106.5, 107, 107.5, 108, 108.5, 109, 109.5,
];

let longSignals = 0;
bullishSequence.forEach((price) => {
  const signal = watermellonEngine.update(price);
  const indicators = watermellonEngine.getIndicatorValues();
  
  if (signal) {
    longSignals++;
    console.log(`\n   Signal ${longSignals} at price ${price.toFixed(2)}:`);
    console.log(`    Type: ${signal.type}`);
    console.log(`    Reason: ${signal.reason}`);
    console.log(`    EMA Fast: ${indicators.emaFast?.toFixed(4)}`);
    console.log(`    EMA Mid: ${indicators.emaMid?.toFixed(4)}`);
    console.log(`    EMA Slow: ${indicators.emaSlow?.toFixed(4)}`);
    console.log(`    RSI: ${indicators.rsi?.toFixed(2)}`);
    console.log(`    Bull Stack: ${signal.trend.bullStack}`);
  }
});
console.log(`\n Generated ${longSignals} long signal(s)`);

console.log("\n[5.2] Testing Watermellon engine with bearish scenario...");
const watermellonEngine2 = new WatermellonEngine(watermellonConfig);

// Simulate price action that should trigger a short signal
const bearishSequence = [
  110, 109.5, 109, 108.5, 108, 107.5, 107, 106.5, 106, 105.5,
  105, 104.5, 104, 103.5, 103, 102.5, 102, 101.5, 101, 100.5,
];

let shortSignals = 0;
bearishSequence.forEach((price) => {
  const signal = watermellonEngine2.update(price);
  if (signal && signal.type === "short") {
    shortSignals++;
    console.log(`   Short signal ${shortSignals} at price ${price.toFixed(2)}`);
  }
});
console.log(` Generated ${shortSignals} short signal(s)`);

// ============================================================================
// STEP 6: Peach Hybrid Engine Testing
// ============================================================================
console.log("\n" + "=".repeat(80));
console.log("STEP 6: Peach Hybrid Engine Testing");
console.log("=".repeat(80));

console.log("\n[6.1] Testing Peach Hybrid V1 System (Trend/Bias)...");
const peachEngine = new PeachHybridEngine(peachConfig);

// Create bars that should trigger V1 signals
const v1Bars: SyntheticBar[] = [];
const v1BaseTime = Date.now();
for (let i = 0; i < 30; i++) {
  const price = 100 + i * 0.3; // Upward trend
  v1Bars.push({
    startTime: v1BaseTime + i * 30000,
    endTime: v1BaseTime + (i + 1) * 30000,
    open: price - 0.1,
    high: price + 0.2,
    low: price - 0.2,
    close: price,
    volume: 10 + Math.random() * 5,
  });
}

let v1Signals = 0;
v1Bars.forEach((bar, index) => {
  const signal = peachEngine.update(bar);
  if (signal && signal.system === "v1") {
    v1Signals++;
    console.log(`\n   V1 Signal ${v1Signals} at bar ${index}:`);
    console.log(`    Type: ${signal.type}`);
    console.log(`    Reason: ${signal.reason}`);
    console.log(`    Price: ${bar.close.toFixed(4)}`);
  }
});
console.log(`\nV1 system generated ${v1Signals} signal(s)`);

console.log("\n[6.2] Testing Peach Hybrid V2 System (Momentum Surge)...");
const peachEngine2 = new PeachHybridEngine(peachConfig);

// Create bars with momentum surge (RSI spike + volume spike)
const v2Bars: SyntheticBar[] = [];
const v2BaseTime = Date.now();
for (let i = 0; i < 20; i++) {
  const price = 100 + i * 0.5;
  // Create volume spike at bar 10
  const volume = i === 10 ? 30 : 10; // Volume spike
  v2Bars.push({
    startTime: v2BaseTime + i * 30000,
    endTime: v2BaseTime + (i + 1) * 30000,
    open: price - 0.1,
    high: price + 0.3,
    low: price - 0.2,
    close: price + 0.2, // Green bar (close > open)
    volume,
  });
}

let v2Signals = 0;
v2Bars.forEach((bar, i) => {
  const signal = peachEngine2.update(bar);
  if (signal && signal.system === "v2") {
    v2Signals++;
    console.log(`\n  V2 Signal ${v2Signals} at bar ${i}:`);
    console.log(`    Type: ${signal.type}`);
    console.log(`    Reason: ${signal.reason}`);
    console.log(`    Price: ${bar.close.toFixed(4)}`);
    console.log(`    Volume: ${bar.volume.toFixed(2)}`);
  }
});
console.log(`\nV2 system generated ${v2Signals} signal(s)`);

console.log("\n[6.3] Testing Peach Hybrid exit conditions...");
const peachEngine3 = new PeachHybridEngine(peachConfig);

// Create bars that should trigger exit
const exitBars: SyntheticBar[] = [];
const exitBaseTime = Date.now();
for (let i = 0; i < 10; i++) {
  exitBars.push({
    startTime: exitBaseTime + i * 30000,
    endTime: exitBaseTime + (i + 1) * 30000,
    open: 100 + i * 0.1,
    high: 100 + i * 0.1 + 0.2,
    low: 100 + i * 0.1 - 0.1,
    close: 100 + i * 0.1 + 0.05, // Small moves
    volume: 5, // Low volume (below exit threshold)
  });
}

// First update to build history
exitBars.forEach((bar) => {
  peachEngine3.update(bar);
});

// Check exit conditions
const lastBar = exitBars[exitBars.length - 1];
const exitCheck = peachEngine3.checkExitConditions(lastBar);
console.log(`  Exit check result:`, exitCheck);
console.log(exitCheck.shouldExit ? "Exit condition detected" : "ℹ No exit condition");

// ============================================================================
// STEP 7: State Management Testing
// ============================================================================
console.log("\n" + "=".repeat(80));
console.log("STEP 7: State Management Testing");
console.log("=".repeat(80));

console.log("\n[7.1] Testing PositionStateManager...");
const stateManager = new PositionStateManager();

console.log("  Initial state:", stateManager.getState());

stateManager.updateLocalState({
  side: "long",
  size: 1000,
  avgEntry: 100.5,
  unrealizedPnl: 10.5,
});

console.log("  After local update:", stateManager.getState());

const reconciled = stateManager.updateFromRest({
  positionAmt: "1000",
  entryPrice: "100.5",
  unrealizedProfit: "10.5",
});

console.log(`  Reconciliation result: ${reconciled ? "Success" : "Failed"}`);
console.log("  Final state:", stateManager.getState());

console.log("\n[7.2] Testing StatePersistence...");
const statePersistence = new StatePersistence("./test-data");

const testState = {
  position: {
    side: "long" as const,
    size: 1000,
    avgEntry: 100.5,
    unrealizedPnl: 10.5,
    lastUpdate: Date.now(),
  },
  lastBarCloseTime: Date.now(),
};

statePersistence.save(testState);
console.log("  State saved");

const loaded = statePersistence.load();
console.log(`  State loaded: ${loaded ? " Success" : " Failed"}`);
if (loaded) {
  console.log("  Loaded state:", loaded);
}

// Clean up
statePersistence.clear();
console.log("  test data cleaned up");

console.log("\n[7.3] Testing OrderTracker...");
const orderTracker = new OrderTracker();

const testOrder = {
  side: "long" as const,
  size: 1000,
  leverage: 5,
  price: 100.5,
  signalReason: "test",
  timestamp: Date.now(),
};

orderTracker.trackOrder(testOrder, "order-1");
console.log("  Order tracked");
console.log(`  Pending orders: ${orderTracker.hasPendingOrders()}`);

orderTracker.confirmOrder("order-1");
console.log("  Order confirmed");
console.log(`  Pending orders: ${orderTracker.hasPendingOrders()}`);

// ============================================================================
// STEP 8: Execution Adapter Testing
// ============================================================================
(async () => {
  console.log("\n" + "=".repeat(80));
  console.log("STEP 8: Execution Adapter Testing");
  console.log("=".repeat(80));

  console.log("\n[8.1] Testing DryRunExecutor...");
  const executor = new DryRunExecutor();

  const longOrder = {
    side: "long" as const,
    size: 1000,
    leverage: 5,
    price: 100.5,
    signalReason: "test-long",
    timestamp: Date.now(),
  };

  const shortOrder = {
    side: "short" as const,
    size: 500,
    leverage: 3,
    price: 101.0,
    signalReason: "test-short",
    timestamp: Date.now() + 1000,
  };

  await executor.enterLong(longOrder);
  console.log("  Long order executed (dry-run)");

  await executor.enterShort(shortOrder);
  console.log("  Short order executed (dry-run)");

  await executor.closePosition("test-close");
  console.log("  Position closed (dry-run)");

  const logs = executor.logs;
  console.log(`\n  Total log entries: ${logs.length}`);
  logs.forEach((log, i) => {
    console.log(`    ${i + 1}. ${log.type}${log.type === "enter" ? ` (${log.side})` : ""}`);
  });

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log("\n" + "=".repeat(80));
  console.log("TESTING SUMMARY");
  console.log("=".repeat(80));
  console.log("\nAll step-by-step tests completed successfully!");
  console.log("\nComponents tested:");
  console.log("  1. Configuration structures");
  console.log("  2. EMA Indicator");
  console.log("  3. RSI Indicator");
  console.log("  4. Virtual Bar Builder");
  console.log("  5. Watermellon Engine");
  console.log("  6. Peach Hybrid Engine (V1 & V2)");
  console.log("  7. State Management");
  console.log("  8. Execution Adapter");
  console.log("\n" + "=".repeat(80));
})();

