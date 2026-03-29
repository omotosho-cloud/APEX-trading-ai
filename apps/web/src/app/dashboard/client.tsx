"use client";

import { useActiveSignals, useUserSettings, useDashboardStore, selectActivePair, selectActiveTimeframe } from "@apex/lib";
import { SectionErrorBoundary } from "@apex/ui";
import DashboardNav from "../../modules/dashboard/nav";
import PairList from "../../modules/dashboard/pair-list";
import SignalDetail from "../../modules/dashboard/signal-detail";
import { useSignalWebSocket } from "../../modules/dashboard/use-signal-websocket";
import { useCallback } from "react";

export default function DashboardClient() {
  const activePair = useDashboardStore(selectActivePair);
  const activeTimeframe = useDashboardStore(selectActiveTimeframe);
  const setActivePair = useDashboardStore((s) => s.setActivePair);
  const setActiveTimeframe = useDashboardStore((s) => s.setActiveTimeframe);

  const { data: signals, loading } = useActiveSignals();
  const { data: user } = useUserSettings();
  const { connect, isLive, lastUpdated } = useSignalWebSocket();

  // Connect WebSocket on mount via callback ref pattern (no useEffect)
  const connectRef = useCallback((node: HTMLDivElement | null) => {
    if (node) connect();
  }, [connect]);

  const pairSignals = signals.filter((s) => s.instrument === activePair);

  return (
    <div ref={connectRef} className="flex flex-col h-screen bg-surface">
      <DashboardNav isLive={isLive} lastUpdated={lastUpdated} />
      <div className="flex flex-1 overflow-hidden">
        <SectionErrorBoundary>
          <PairList
            signals={signals}
            activePair={activePair}
            onSelect={setActivePair}
          />
        </SectionErrorBoundary>
        <SectionErrorBoundary>
          <SignalDetail
            instrument={activePair}
            signals={pairSignals}
            activeTimeframe={activeTimeframe}
            onTimeframeSelect={setActiveTimeframe}
            accountSize={user?.account_size ? Number(user.account_size) : undefined}
            riskPct={user?.risk_pct ? Number(user.risk_pct) : 1}
            loading={loading}
          />
        </SectionErrorBoundary>
      </div>
    </div>
  );
}
