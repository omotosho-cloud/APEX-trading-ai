import type { Signal } from "@apex/types";

type PairTileProps = {
  instrument: string;
  signals: Signal[];
  isActive: boolean;
  onClick: () => void;
};

const TIMEFRAMES = ["M5", "M15", "M30", "H1", "H4", "D1", "W1"] as const;

const DOT_COLOR: Record<string, string> = {
  buy:     "bg-signal-buy",
  sell:    "bg-signal-sell",
  neutral: "bg-text-muted",
};

const BIAS_COLOR: Record<string, string> = {
  buy:     "text-signal-buy",
  sell:    "text-signal-sell",
  neutral: "text-text-muted",
};

function getOverallBias(signals: Signal[]): string {
  const buys  = signals.filter((s) => s.direction === "buy").length;
  const sells = signals.filter((s) => s.direction === "sell").length;
  if (buys > sells && buys >= 3) return "buy";
  if (sells > buys && sells >= 3) return "sell";
  return "neutral";
}

export const PairTile = ({ instrument, signals, isActive, onClick }: PairTileProps) => {
  const bias = getOverallBias(signals);
  const display = instrument.replace("USDT", "/USDT").replace(/(EUR|GBP|USD|AUD|NZD|CAD|CHF|JPY|NZD)(?=[A-Z])/, "$1/");

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors text-left ${
        isActive
          ? "bg-primary/10 border border-primary/30"
          : "hover:bg-surface-elevated border border-transparent"
      }`}
    >
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm font-medium text-text-primary truncate">{display}</span>
        <span className={`text-xs font-bold ${BIAS_COLOR[bias]}`}>
          {bias === "buy" ? "BUY" : bias === "sell" ? "SELL" : "───"}
        </span>
      </div>
      <div className="flex items-center gap-0.5 ml-2">
        {TIMEFRAMES.map((tf) => {
          const sig = signals.find((s) => s.timeframe === tf);
          return (
            <span
              key={tf}
              className={`h-1.5 w-1.5 rounded-full ${sig ? DOT_COLOR[sig.direction] ?? "bg-text-muted" : "bg-surface-border"}`}
              title={`${tf}: ${sig?.direction ?? "no signal"}`}
            />
          );
        })}
      </div>
    </button>
  );
};
