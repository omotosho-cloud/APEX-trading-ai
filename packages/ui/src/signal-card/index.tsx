import type { Signal } from "@apex/types";
import { ConfidenceBar } from "../confidence-bar";

type SignalCardProps = {
  signal: Signal;
  accountSize?: number;
  riskPct?: number;
};

const DIRECTION_STYLE: Record<string, string> = {
  buy:     "bg-signal-buy/10 text-signal-buy border-signal-buy/20",
  sell:    "bg-signal-sell/10 text-signal-sell border-signal-sell/20",
  neutral: "bg-surface-elevated text-text-muted border-surface-border",
};

const TAG_STYLE: Record<string, string> = {
  HIGH_QUALITY:       "bg-quality-high/10 text-quality-high",
  PREMIUM:            "bg-quality-premium/10 text-quality-premium",
  LOW_CONFIDENCE:     "bg-surface-elevated text-text-muted",
  SANITY_CAP_APPLIED: "bg-signal-sell/10 text-signal-sell",
  EVENT_RISK:         "bg-yellow-500/10 text-yellow-400",
};

function fmt(n: number | string | null | undefined, decimals = 5): string {
  if (n === null || n === undefined) return "─";
  return Number(n).toFixed(decimals);
}

function calcLotSize(accountSize: number, riskPct: number, entry: number, sl: number, instrument: string): string {
  const PIP_VALUE: Record<string, number> = {
    EURUSD: 10, GBPUSD: 10, USDJPY: 9.09, USDCHF: 10,
    AUDUSD: 10, USDCAD: 7.69, NZDUSD: 10, EURGBP: 10,
    EURJPY: 9.09, GBPJPY: 9.09, BTCUSDT: 1, ETHUSDT: 1,
    BNBUSDT: 1, SOLUSDT: 1, XRPUSDT: 1,
  };
  const riskAmount = accountSize * (riskPct / 100);
  const slPips = Math.abs(entry - sl) * 10000;
  const pipValue = PIP_VALUE[instrument] ?? 10;
  return (riskAmount / (slPips * pipValue)).toFixed(2);
}

export const SignalCard = ({ signal, accountSize, riskPct = 1 }: SignalCardProps) => {
  const entry = Number(signal.entry_price);
  const sl    = Number(signal.sl_price);
  const tp1   = Number(signal.tp1_price);
  const tp2   = Number(signal.tp2_price);
  const tp3   = signal.tp3_price ? Number(signal.tp3_price) : null;
  const isBuy = signal.direction === "buy";
  const decimals = signal.instrument.includes("JPY") ? 3 : signal.instrument.includes("USDT") ? 2 : 5;

  const lotSize = accountSize
    ? calcLotSize(accountSize, riskPct, entry, sl, signal.instrument)
    : null;

  const expertVotes = signal.expert_votes as Record<string, { direction: string; confidence: number }>;

  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-text-primary">{signal.instrument}</span>
            {signal.quality_tag && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TAG_STYLE[signal.quality_tag] ?? ""}`}>
                {signal.quality_tag.replace(/_/g, " ")}
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            {signal.timeframe} · {signal.regime.replace(/_/g, " ")} · {signal.session ?? ""}
          </p>
        </div>
        <span className={`text-sm font-bold px-3 py-1 rounded-lg border ${DIRECTION_STYLE[signal.direction]}`}>
          {signal.direction.toUpperCase()}
        </span>
      </div>

      {/* Confidence */}
      <div>
        <div className="flex justify-between text-xs text-text-muted mb-1.5">
          <span>Confidence</span>
          <span className="font-mono text-text-primary">{signal.confidence}%</span>
        </div>
        <ConfidenceBar value={signal.confidence} />
      </div>

      {/* Price levels */}
      <div className="space-y-1.5 text-xs border-t border-surface-border pt-3">
        {[
          { label: "Entry zone", value: fmt(entry, decimals), sub: "at market" },
          { label: "Stop loss",  value: fmt(sl, decimals),    sub: `${Number(signal.atr_value).toFixed(decimals)} ATR` },
          { label: "TP1 (50%)", value: fmt(tp1, decimals),   sub: "move SL to BE" },
          { label: "TP2 (30%)", value: fmt(tp2, decimals),   sub: `R:R 1:${signal.rr_ratio}` },
          ...(tp3 ? [{ label: "TP3 (20%)", value: fmt(tp3, decimals), sub: "runner" }] : []),
        ].map((row) => (
          <div key={row.label} className="flex justify-between items-center">
            <span className="text-text-muted w-24">{row.label}</span>
            <span className="font-mono text-text-primary">{row.value}</span>
            <span className="text-text-muted text-right">{row.sub}</span>
          </div>
        ))}
      </div>

      {/* R:R + Lot size */}
      <div className="flex justify-between text-xs border-t border-surface-border pt-3">
        <div>
          <span className="text-text-muted">Risk:Reward</span>
          <span className="ml-2 font-mono text-text-primary">1:{signal.rr_ratio}</span>
        </div>
        {lotSize && (
          <div>
            <span className="text-text-muted">Lot size</span>
            <span className="ml-2 font-mono text-text-primary">{lotSize}</span>
          </div>
        )}
      </div>

      {/* Expert votes */}
      <div className="border-t border-surface-border pt-3 space-y-2">
        <p className="text-xs text-text-muted">Expert votes</p>
        {Object.entries(expertVotes).map(([name, vote]) => (
          <div key={name} className="flex items-center gap-2">
            <span className="text-xs text-text-muted w-28 capitalize">{name.replace("_", " ")}</span>
            <ConfidenceBar value={vote.confidence} className="flex-1" />
            <span className="text-xs font-mono text-text-secondary w-8 text-right">{vote.confidence}%</span>
          </div>
        ))}
      </div>

      {/* AI Narrative */}
      {signal.ai_narrative && (
        <div className="border-t border-surface-border pt-3">
          <p className="text-xs text-text-muted mb-1.5">AI Analysis</p>
          <p className="text-xs text-text-secondary leading-relaxed">{signal.ai_narrative}</p>
        </div>
      )}

      {/* Expiry */}
      <div className="border-t border-surface-border pt-2">
        <p className="text-xs text-text-muted">
          Valid until{" "}
          <span className="font-mono text-text-secondary">
            {new Date(signal.valid_until).toLocaleString("en-NG", {
              day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
            })}
          </span>
        </p>
      </div>
    </div>
  );
};
