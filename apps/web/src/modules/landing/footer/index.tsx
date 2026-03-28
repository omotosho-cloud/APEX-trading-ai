import Link from "next/link";

const DISCLAIMER =
  "APEX signals are for informational and educational purposes only. They do not constitute financial advice. Trading foreign exchange, cryptocurrencies, and other financial instruments involves substantial risk of loss. Past signal performance does not guarantee future results. Always trade with money you can afford to lose. APEX is not registered as an investment advisor. You are solely responsible for your trading decisions.";

export default function LandingFooter() {
  return (
    <footer id="about" className="border-t border-surface-border">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid sm:grid-cols-3 gap-8 mb-10">
          <div>
            <p className="font-bold text-text-primary mb-2">
              APEX <span className="text-primary text-xs font-mono">AI</span>
            </p>
            <p className="text-xs text-text-muted leading-relaxed">
              Adaptive Predictive Expert System. AI-powered trading signals for retail and prop
              firm traders.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-widest mb-3">
              Product
            </p>
            <ul className="space-y-2 text-sm text-text-muted">
              <li><a href="#features" className="hover:text-text-primary transition-colors">Features</a></li>
              <li><a href="#pricing" className="hover:text-text-primary transition-colors">Pricing</a></li>
              <li><Link href="/login" className="hover:text-text-primary transition-colors">Sign in</Link></li>
              <li><Link href="/register" className="hover:text-text-primary transition-colors">Create account</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-widest mb-3">
              Instruments
            </p>
            <p className="text-xs text-text-muted leading-relaxed">
              EUR/USD · GBP/USD · USD/JPY · USD/CHF · AUD/USD · USD/CAD · NZD/USD · EUR/GBP ·
              EUR/JPY · GBP/JPY
              <br /><br />
              BTC/USDT · ETH/USDT · BNB/USDT · SOL/USDT · XRP/USDT
            </p>
          </div>
        </div>

        <div className="border-t border-surface-border pt-6">
          <p className="text-xs text-text-muted leading-relaxed">{DISCLAIMER}</p>
          <p className="text-xs text-text-muted mt-3">
            © {new Date().getFullYear()} APEX. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
