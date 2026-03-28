import Link from "next/link";

const PLANS = [
  {
    name: "Starter",
    price: "₦4,999",
    period: "/month",
    desc: "For traders getting started",
    features: ["7 forex pairs", "H1, H4, D1 timeframes", "Email alerts", "7-day free trial"],
    highlight: false,
  },
  {
    name: "Pro",
    price: "₦9,999",
    period: "/month",
    desc: "For active traders",
    features: ["All 15 pairs", "All 7 timeframes", "Email + Telegram alerts", "Full signal detail", "7-day free trial"],
    highlight: true,
  },
  {
    name: "Elite",
    price: "₦19,999",
    period: "/month",
    desc: "For professional traders",
    features: ["Everything in Pro", "Copy signals feature", "Push notifications", "Priority support", "7-day free trial"],
    highlight: false,
  },
];

export default function LandingPricing() {
  return (
    <section id="pricing" className="mx-auto max-w-6xl px-4 pb-24">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-text-primary mb-3">
          Simple, transparent pricing
        </h2>
        <p className="text-text-secondary">All plans include a 7-day free trial. No card required.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {PLANS.map((p) => (
          <div
            key={p.name}
            className={`relative rounded-xl border p-6 flex flex-col ${
              p.highlight
                ? "border-primary bg-primary/5"
                : "border-surface-border bg-surface-card"
            }`}
          >
            {p.highlight && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">
                Most popular
              </span>
            )}
            <div className="mb-4">
              <p className="font-bold text-text-primary text-lg">{p.name}</p>
              <p className="text-text-muted text-xs mb-3">{p.desc}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-text-primary">{p.price}</span>
                <span className="text-text-muted text-sm">{p.period}</span>
              </div>
            </div>

            <ul className="space-y-2 mb-6 flex-1">
              {p.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-text-secondary">
                  <span className="text-signal-buy text-xs">✓</span>
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href="/register"
              className={`text-center text-sm font-semibold py-2.5 rounded-xl transition-colors ${
                p.highlight
                  ? "bg-primary hover:bg-primary-dark text-white"
                  : "border border-surface-border hover:border-primary text-text-secondary hover:text-text-primary"
              }`}
            >
              Start free
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
