import PairRow from "./pair-row";

const DISCLAIMER =
  "APEX signals are for informational and educational purposes only. They do not constitute financial advice. Trading involves substantial risk of loss. Past performance does not guarantee future results.";

const FOREX_PAIRS = [
  { pair: "EUR/USD", dir: "BUY",  conf: 74 },
  { pair: "GBP/USD", dir: "SELL", conf: 68 },
  { pair: "USD/JPY", dir: "BUY",  conf: 71 },
  { pair: "AUD/USD", dir: "SELL", conf: 63 },
  { pair: "USD/CAD", dir: "BUY",  conf: 66 },
];

const CRYPTO_PAIRS = [
  { pair: "BTC/USDT", dir: "BUY",  conf: 79 },
  { pair: "ETH/USDT", dir: "BUY",  conf: 72 },
  { pair: "SOL/USDT", dir: "SELL", conf: 61 },
];

const SIGNAL_LEVELS = [
  { label: "Entry zone", value: "1.08520", sub: "at market" },
  { label: "Stop loss",  value: "1.08340", sub: "1.5× ATR" },
  { label: "TP1 (50%)",  value: "1.08700", sub: "move SL to BE" },
  { label: "TP2 (30%)",  value: "1.08880", sub: "R:R 1:2.0" },
  { label: "TP3 (20%)",  value: "1.09160", sub: "runner" },
];

const EXPERT_VOTES = [
  { name: "Technical",   val: 81 },
  { name: "Smart Money", val: 74 },
  { name: "Macro",       val: 62 },
];

export default function LandingSignalPreview() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-24">
      <div className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden">
        {/* Terminal bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-border bg-surface">
          <span className="h-3 w-3 rounded-full bg-red-500/70" />
          <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
          <span className="h-3 w-3 rounded-full bg-signal-buy/70" />
          <span className="ml-3 text-xs text-text-muted font-mono">apex — live signals</span>
          <span className="ml-auto flex items-center gap-1.5 text-xs text-signal-buy">
            <span className="h-1.5 w-1.5 rounded-full bg-signal-buy animate-pulse-slow" />
            LIVE
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-surface-border">
          {/* Pair list */}
          <div className="p-4 space-y-1">
            <p className="text-xs text-text-muted uppercase tracking-widest mb-3">Forex</p>
            {FOREX_PAIRS.map((r) => <PairRow key={r.pair} {...r} />)}
            <p className="text-xs text-text-muted uppercase tracking-widest mt-4 mb-3">Crypto</p>
            {CRYPTO_PAIRS.map((r) => <PairRow key={r.pair} {...r} />)}
          </div>

          {/* Sample signal card */}
          <div className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-bold text-text-primary">EUR/USD</p>
                <p className="text-xs text-text-muted">Swing · H4 · Trending regime</p>
              </div>
              <span className="bg-signal-buy/10 text-signal-buy text-xs font-bold px-2.5 py-1 rounded-lg">
                BUY
              </span>
            </div>

            <div className="mb-3">
              <div className="flex justify-between text-xs text-text-muted mb-1">
                <span>Confidence</span>
                <span className="text-text-primary font-mono">74%</span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-elevated overflow-hidden">
                <div className="h-full rounded-full bg-primary" style={{ width: "74%" }} />
              </div>
            </div>

            <div className="space-y-1.5 text-xs mb-3">
              {SIGNAL_LEVELS.map((row) => (
                <div key={row.label} className="flex justify-between">
                  <span className="text-text-muted">{row.label}</span>
                  <span className="font-mono text-text-primary">{row.value}</span>
                  <span className="text-text-muted">{row.sub}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-surface-border pt-3 space-y-1.5">
              <p className="text-xs text-text-muted mb-2">Expert votes</p>
              {EXPERT_VOTES.map((e) => (
                <div key={e.name} className="flex items-center gap-2">
                  <span className="text-xs text-text-muted w-24">{e.name}</span>
                  <div className="flex-1 h-1 rounded-full bg-surface-elevated overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${e.val}%` }} />
                  </div>
                  <span className="text-xs font-mono text-text-secondary w-8 text-right">{e.val}%</span>
                </div>
              ))}
            </div>

            <p className="text-xs text-text-muted mt-3 leading-relaxed border-t border-surface-border pt-3">
              EUR/USD in confirmed uptrend. ADX 31, Hurst 0.61. Pullback to EMA20 complete.
              Targeting measured move extension.
            </p>
          </div>
        </div>
      </div>
      <p className="text-center text-xs text-text-muted mt-3">{DISCLAIMER}</p>
    </section>
  );
}
