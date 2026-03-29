"use client";

import type { Signal } from "@apex/types";
import { SignalCard, SectionErrorBoundary, Skeleton } from "@apex/ui";
import TimeframeStrip from "../timeframe-strip";

type SignalDetailProps = {
  instrument: string;
  signals: Signal[];
  activeTimeframe: string;
  onTimeframeSelect: (tf: string) => void;
  accountSize?: number;
  riskPct?: number;
  loading?: boolean;
};

export default function SignalDetail({
  instrument,
  signals,
  activeTimeframe,
  onTimeframeSelect,
  accountSize,
  riskPct,
  loading,
}: SignalDetailProps) {
  const activeSignal = signals.find((s) => s.timeframe === activeTimeframe);

  if (loading) {
    return (
      <div className="flex-1 p-4 space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      <SectionErrorBoundary>
        <TimeframeStrip
          instrument={instrument}
          signals={signals}
          activeTimeframe={activeTimeframe}
          onSelect={onTimeframeSelect}
        />
      </SectionErrorBoundary>

      {activeSignal ? (
        <SectionErrorBoundary>
          <SignalCard
            signal={activeSignal}
            accountSize={accountSize}
            riskPct={riskPct}
          />
        </SectionErrorBoundary>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-text-muted text-sm">No active signal for {instrument} {activeTimeframe}</p>
          <p className="text-text-muted text-xs mt-1">Select a timeframe with a signal above</p>
        </div>
      )}
    </div>
  );
}
