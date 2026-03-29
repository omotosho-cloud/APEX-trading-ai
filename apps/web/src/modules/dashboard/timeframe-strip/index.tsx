"use client";

import type { Signal } from "@apex/types";
import { ConfidenceBar } from "@apex/ui";

const TIMEFRAMES = ["M5","M15","M30","H1","H4","D1","W1"] as const;

const DIR_STYLE: Record<string, string> = {
  buy:     "text-signal-buy bg-signal-buy/10",
  sell:    "text-signal-sell bg-signal-sell/10",
  neutral: "text-text-muted bg-surface-elevated",
};

type TimeframeStripProps = {
  instrument: string;
  signals: Signal[];
  activeTimeframe: string;
  onSelect: (tf: string) => void;
};

export default function TimeframeStrip({
  instrument,
  signals,
  activeTimeframe,
  onSelect,
}: TimeframeStripProps) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-text-muted uppercase tracking-widest mb-3">
        {instrument} — Timeframe signals
      </p>
      {TIMEFRAMES.map((tf) => {
        const sig = signals.find((s) => s.timeframe === tf);
        const isActive = activeTimeframe === tf;

        return (
          <button
            key={tf}
            onClick={() => sig && onSelect(tf)}
            disabled={!sig}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
              isActive
                ? "bg-primary/10 border border-primary/20"
                : sig
                ? "hover:bg-surface-elevated border border-transparent"
                : "opacity-40 cursor-default border border-transparent"
            }`}
          >
            <span className="text-xs font-mono text-text-muted w-8">{tf}</span>
            {sig ? (
              <>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${DIR_STYLE[sig.direction]}`}>
                  {sig.direction.toUpperCase()}
                </span>
                <ConfidenceBar value={sig.confidence} className="flex-1" />
                <span className="text-xs font-mono text-text-secondary w-8 text-right">
                  {sig.confidence}%
                </span>
              </>
            ) : (
              <span className="text-xs text-text-muted">no signal</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
