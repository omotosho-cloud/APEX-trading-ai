"use client";

import type { Signal } from "@apex/types";
import { ConfidenceBar } from "@apex/ui";

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
  const sig = signals.find((s) => s.timeframe === "H4");

  return (
    <div className="space-y-1">
      <p className="text-xs text-text-muted uppercase tracking-widest mb-3">
        {instrument} — H4 Signal
      </p>
      <button
        onClick={() => sig && onSelect("H4")}
        disabled={!sig}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
          activeTimeframe === "H4"
            ? "bg-primary/10 border border-primary/20"
            : sig
            ? "hover:bg-surface-elevated border border-transparent"
            : "opacity-40 cursor-default border border-transparent"
        }`}
      >
        <span className="text-xs font-mono font-bold text-primary w-8">H4</span>
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
    </div>
  );
}
