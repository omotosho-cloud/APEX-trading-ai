const FEATURES = [
  {
    icon: "⚡",
    title: "Real-time signals",
    desc: "Generated on every M5 candle close across 15 instruments and 7 timeframes — 105 signal slots updated continuously.",
  },
  {
    icon: "🧠",
    title: "Mixture-of-Experts AI",
    desc: "6 expert agents vote in parallel — Technical, Smart Money, Sentiment, Macro, Quant, and a Sanity Check validator.",
  },
  {
    icon: "📊",
    title: "Regime classification",
    desc: "5-pillar regime engine (ADX, Hurst, ATR ratio, BB bandwidth, price structure) classifies trending, ranging, breakout, and volatile markets.",
  },
  {
    icon: "🎯",
    title: "Precise TP/SL levels",
    desc: "ATR-based entry, stop loss, and three take-profit targets with slippage-adjusted R:R. Minimum 1:1.5 R:R enforced before any signal fires.",
  },
  {
    icon: "🛡️",
    title: "NewsGuard protection",
    desc: "Automatically suppresses signals 30 minutes before and after high-impact events — NFP, CPI, FOMC, GDP, Central Bank decisions.",
  },
  {
    icon: "📱",
    title: "Telegram alerts",
    desc: "Instant signal alerts to your Telegram for high-confidence signals (≥70%). Full TP/SL levels in every message.",
  },
];

export default function LandingFeatures() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-4 pb-24">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-text-primary mb-3">
          Everything you need to trade with edge
        </h2>
        <p className="text-text-secondary max-w-xl mx-auto">
          APEX is not a simple indicator. It&apos;s a full AI signal system that adapts to market
          conditions in real time.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="bg-surface-card border border-surface-border rounded-xl p-5 hover:border-primary/40 transition-colors"
          >
            <div className="text-2xl mb-3">{f.icon}</div>
            <h3 className="font-semibold text-text-primary mb-2">{f.title}</h3>
            <p className="text-sm text-text-secondary leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
