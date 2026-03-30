"use client";

import { PairTile } from "@apex/ui";
import type { Signal } from "@apex/types";

// Approved by backtest — H4 only
const APPROVED_PAIRS = ["EURUSD", "USDJPY", "USDCHF", "NZDUSD"] as const;
const WATCH_PAIRS    = ["GBPUSD"] as const; // strong OOS — paper trade 30 days first

type PairListProps = {
  signals: Signal[];
  activePair: string;
  onSelect: (instrument: string) => void;
};

export default function PairList({ signals, activePair, onSelect }: PairListProps) {
  const signalsFor = (instrument: string) =>
    signals.filter((s) => s.instrument === instrument);

  return (
    <aside className="w-52 shrink-0 border-r border-surface-border bg-surface overflow-y-auto">
      <div className="p-2 space-y-0.5">
        {APPROVED_PAIRS.map((inst) => (
          <PairTile
            key={inst}
            instrument={inst}
            signals={signalsFor(inst)}
            isActive={activePair === inst}
            onClick={() => onSelect(inst)}
          />
        ))}
        <div className="my-2 border-t border-surface-border" />
        {WATCH_PAIRS.map((inst) => (
          <PairTile
            key={inst}
            instrument={inst}
            signals={signalsFor(inst)}
            isActive={activePair === inst}
            onClick={() => onSelect(inst)}
          />
        ))}
      </div>
    </aside>
  );
}
