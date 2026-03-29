"use client";

import { PairTile } from "@apex/ui";
import type { Signal } from "@apex/types";

const FOREX = ["EURUSD","GBPUSD","USDJPY","USDCHF","AUDUSD","USDCAD","NZDUSD","EURGBP","EURJPY","GBPJPY"];
const CRYPTO = ["BTCUSDT","ETHUSDT","BNBUSDT","SOLUSDT","XRPUSDT"];

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
      <div className="p-2 space-y-4">
        <div>
          <p className="text-xs text-text-muted uppercase tracking-widest px-2 py-1.5">Forex</p>
          <div className="space-y-0.5">
            {FOREX.map((inst) => (
              <PairTile
                key={inst}
                instrument={inst}
                signals={signalsFor(inst)}
                isActive={activePair === inst}
                onClick={() => onSelect(inst)}
              />
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-text-muted uppercase tracking-widest px-2 py-1.5">Crypto</p>
          <div className="space-y-0.5">
            {CRYPTO.map((inst) => (
              <PairTile
                key={inst}
                instrument={inst}
                signals={signalsFor(inst)}
                isActive={activePair === inst}
                onClick={() => onSelect(inst)}
              />
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
