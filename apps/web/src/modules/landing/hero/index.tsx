import Link from "next/link";

export default function LandingHero() {
  return (
    <section className="relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative mx-auto max-w-6xl px-4 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-surface-card border border-surface-border rounded-full px-3 py-1 text-xs text-text-secondary mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-signal-buy animate-pulse-slow" />
          Live signals across 15 instruments × 7 timeframes
        </div>

        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
          AI-Powered Trading Signals
          <br />
          <span className="text-primary">Built for Serious Traders</span>
        </h1>

        <p className="text-text-secondary text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
          APEX uses a Mixture-of-Experts AI system to classify market regimes and generate
          high-confidence signals across forex and crypto — with full TP/SL levels, R:R ratios,
          and AI narrative in real time.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="w-full sm:w-auto bg-primary hover:bg-primary-dark text-white font-semibold px-8 py-3 rounded-xl transition-colors text-sm"
          >
            Start 7-day free trial
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto border border-surface-border hover:border-primary text-text-secondary hover:text-text-primary font-medium px-8 py-3 rounded-xl transition-colors text-sm"
          >
            Sign in to dashboard →
          </Link>
        </div>

        <p className="text-xs text-text-muted mt-4">No card required · Cancel anytime</p>
      </div>
    </section>
  );
}
