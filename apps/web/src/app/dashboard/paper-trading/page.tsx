"use client";

import { useApiQuery } from "@apex/lib/client";
import { SectionErrorBoundary, Skeleton } from "@apex/ui";
import { PAPER_TRADING_KEY } from "@apex/lib/query-keys";
import { MIN_1_CACHE_TIME } from "@apex/lib/cache-config";

type PairStats = {
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  netR: number;
};

type Metrics = {
  totalSignals: number;
  activeCount: number;
  closedCount: number;
  winRate: number;
  wins: number;
  losses: number;
  expired: number;
  tp1Hits: number;
  tp2Hits: number;
  tp3Hits: number;
  netR: number;
  hoursRunning: number;
  byPair: Record<string, PairStats>;
  targets: { winRate: number; sharpe: number; maxDD: number };
};

type PaperTradingResponse = {
  metrics: Metrics;
  activeSignals: {
    id: string;
    instrument: string;
    direction: "buy" | "sell";
    confidence: number;
    entry_price: string;
    tp1_price: string;
    tp2_price: string;
    tp3_price: string | null;
    sl_price: string;
    rr_ratio: string;
    regime: string;
    fired_at: string;
  }[];
};

function MetricCard({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: "green" | "red" | "yellow" }) {
  const color = highlight === "green" ? "text-green-400" : highlight === "red" ? "text-red-400" : highlight === "yellow" ? "text-yellow-400" : "text-text-primary";
  return (
    <div className="bg-surface-elevated rounded-lg border border-surface-border p-4">
      <p className="text-xs text-text-muted uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-2xl font-bold font-mono ${color}`}>{value}</p>
      {sub && <p className="text-xs text-text-muted mt-1">{sub}</p>}
    </div>
  );
}

function PaperTradingContent({ data }: { data: PaperTradingResponse }) {
  const { metrics, activeSignals } = data;
  const vsTarget = metrics.winRate - metrics.targets.winRate;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Paper Trading — H4</h1>
        <span className="text-xs text-text-muted">
          Running {metrics.hoursRunning.toFixed(0)}h
        </span>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Win Rate"
          value={`${metrics.winRate.toFixed(1)}%`}
          sub={`Target: ${metrics.targets.winRate}% (${vsTarget >= 0 ? "+" : ""}${vsTarget.toFixed(1)}%)`}
          highlight={metrics.winRate >= metrics.targets.winRate ? "green" : metrics.winRate >= 48 ? "yellow" : "red"}
        />
        <MetricCard
          label="Net R"
          value={`${metrics.netR >= 0 ? "+" : ""}${metrics.netR.toFixed(2)}R`}
          sub={`${metrics.wins}W / ${metrics.losses}L / ${metrics.expired} exp`}
          highlight={metrics.netR >= 0 ? "green" : "red"}
        />
        <MetricCard
          label="Signals"
          value={String(metrics.totalSignals)}
          sub={`${metrics.activeCount} active · ${metrics.closedCount} closed`}
        />
        <MetricCard
          label="TP Breakdown"
          value={`${metrics.tp1Hits}/${metrics.tp2Hits}/${metrics.tp3Hits}`}
          sub="TP1 / TP2 / TP3 hits"
          highlight={metrics.tp2Hits + metrics.tp3Hits > 0 ? "green" : undefined}
        />
      </div>

      {/* Per-pair breakdown */}
      <div className="bg-surface-elevated rounded-lg border border-surface-border p-4">
        <p className="text-xs text-text-muted uppercase tracking-widest mb-3">Per Pair Performance</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border text-xs text-text-muted">
              <th className="text-left py-2">Pair</th>
              <th className="text-right py-2">Trades</th>
              <th className="text-right py-2">W/L</th>
              <th className="text-right py-2">Win Rate</th>
              <th className="text-right py-2">Net R</th>
              <th className="text-right py-2">vs Target</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(metrics.byPair).map(([pair, stats]) => {
              const color = stats.winRate >= 54 ? "text-green-400" : stats.winRate >= 48 ? "text-yellow-400" : "text-red-400";
              return (
                <tr key={pair} className="border-b border-surface-border/50">
                  <td className="py-2 font-mono font-medium">{pair}</td>
                  <td className="py-2 text-right text-text-muted">{stats.trades}</td>
                  <td className="py-2 text-right text-text-muted">{stats.wins}/{stats.losses}</td>
                  <td className={`py-2 text-right font-mono font-bold ${color}`}>{stats.winRate}%</td>
                  <td className={`py-2 text-right font-mono ${stats.netR >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {stats.netR >= 0 ? "+" : ""}{stats.netR}R
                  </td>
                  <td className="py-2 text-right text-xs text-text-muted">
                    {stats.trades >= 5 ? (stats.winRate >= 48 ? "✓" : "✗") : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Active signals */}
      {activeSignals.length > 0 && (
        <div className="bg-surface-elevated rounded-lg border border-surface-border p-4">
          <p className="text-xs text-text-muted uppercase tracking-widest mb-3">Active Signals</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border text-xs text-text-muted">
                <th className="text-left py-2">Pair</th>
                <th className="text-left py-2">Dir</th>
                <th className="text-right py-2">Conf</th>
                <th className="text-right py-2">Entry</th>
                <th className="text-right py-2">SL</th>
                <th className="text-right py-2">TP1</th>
                <th className="text-right py-2">TP2</th>
                <th className="text-right py-2">R:R</th>
                <th className="text-right py-2">Regime</th>
              </tr>
            </thead>
            <tbody>
              {activeSignals.map((s) => (
                <tr key={s.id} className="border-b border-surface-border/50">
                  <td className="py-2 font-mono font-medium">{s.instrument}</td>
                  <td className="py-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${s.direction === "buy" ? "text-green-400 bg-green-400/10" : "text-red-400 bg-red-400/10"}`}>
                      {s.direction.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2 text-right font-mono">{s.confidence}%</td>
                  <td className="py-2 text-right font-mono text-xs">{parseFloat(s.entry_price).toFixed(5)}</td>
                  <td className="py-2 text-right font-mono text-xs text-red-400">{parseFloat(s.sl_price).toFixed(5)}</td>
                  <td className="py-2 text-right font-mono text-xs text-green-400">{parseFloat(s.tp1_price).toFixed(5)}</td>
                  <td className="py-2 text-right font-mono text-xs text-green-400">{parseFloat(s.tp2_price).toFixed(5)}</td>
                  <td className="py-2 text-right font-mono text-xs">{parseFloat(s.rr_ratio).toFixed(2)}</td>
                  <td className="py-2 text-right text-xs text-text-muted">{s.regime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeSignals.length === 0 && (
        <div className="text-center py-12 text-text-muted text-sm">
          No active H4 signals — engine is scanning
        </div>
      )}
    </div>
  );
}

export default function PaperTradingPage() {
  const { data, isLoading: loading, isError } = useApiQuery<PaperTradingResponse>(
    [PAPER_TRADING_KEY],
    "/api/paper-trading/metrics",
    { staleTime: MIN_1_CACHE_TIME },
  );

  if (loading) {
    return (
      <div className="p-6 space-y-4 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return <div className="p-6 text-red-400 text-sm">Failed to load paper trading data</div>;
  }

  return (
    <SectionErrorBoundary>
      <PaperTradingContent data={data} />
    </SectionErrorBoundary>
  );
}
