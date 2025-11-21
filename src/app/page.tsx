import { moonSpec, defaultWatermellonConfig } from "@/lib/spec";
import styles from "./page.module.css";

const configEntries = [
  { label: "EMA Fast", value: defaultWatermellonConfig.emaFastLen },
  { label: "EMA Mid", value: defaultWatermellonConfig.emaMidLen },
  { label: "EMA Slow", value: defaultWatermellonConfig.emaSlowLen },
  { label: "RSI Length", value: defaultWatermellonConfig.rsiLength },
  { label: "RSI > Long", value: defaultWatermellonConfig.rsiMinLong },
  { label: "RSI < Short", value: defaultWatermellonConfig.rsiMaxShort },
  { label: "Virtual TF", value: `${defaultWatermellonConfig.timeframeMs / 1000}s` },
];

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <header className={styles.hero}>
          <span className={styles.eyebrow}>Project Spec</span>
          <h1>{moonSpec.project}</h1>
          <p>{moonSpec.summary}</p>
          <span className={styles.badge}>
            <strong>Instrument</strong>
            {moonSpec.instrument}
          </span>
        </header>

        <section className={styles.grid}>
          <article className={styles.card}>
            <h2>Data & Timeframe</h2>
            <ul>
              <li>Source: {moonSpec.dataFeed.source}</li>
              <li>Fields: {moonSpec.dataFeed.fields.join(", ")}</li>
              <li>Virtual bars: {moonSpec.dataFeed.timeframe}</li>
              <li>Synthetic close drives indicators and decisions.</li>
            </ul>
          </article>

          <article className={styles.card}>
            <h2>Indicator Stack</h2>
            <p>Exact values ported from the TradingView script:</p>
            <ul>
              {configEntries.map((entry) => (
                <li key={entry.label}>
                  <strong>{entry.label}:</strong> {entry.value}
                </li>
              ))}
            </ul>
            <p>Bull stack = fast &gt; mid &gt; slow. Bear stack mirrors it. RSI filters gate the edge-triggered entries.</p>
          </article>

          <article className={styles.card}>
            <h2>Watermellon Triggers</h2>
            <ul>
              <li>longLook = bull stack AND RSI &gt; 42</li>
              <li>shortLook = bear stack AND RSI &lt; 58</li>
              <li>Signals fire only when look flips from false → true.</li>
              <li>Flat → enter on trigger. Long ↔ short flips close then optionally reverse.</li>
            </ul>
          </article>

          <article className={styles.card}>
            <h2>Risk Envelope</h2>
            <ul>
              {moonSpec.risk.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </section>

        <section className={styles.specList}>
          <div>
            <p className={styles.sectionTitle}>Runtime</p>
            <p className={styles.sectionBody}>
              Modes: {moonSpec.runtime.modes.join(" + ")}. Logs: {moonSpec.runtime.logging.join(", ")}. Requirements:{" "}
              {moonSpec.runtime.requirements.join("; ")}.
          </p>
        </div>

          <div>
            <p className={styles.sectionTitle}>Trading Rules</p>
            <p className={styles.sectionBody}>{moonSpec.tradingRules.join(" ")} </p>
        </div>
        </section>
      </main>
    </div>
  );
}
