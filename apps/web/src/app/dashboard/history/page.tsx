"use client";

import { useSignalHistory } from "@apex/lib";
import { SectionErrorBoundary, Skeleton } from "@apex/ui";
import Link from "next/link";

const OUTCOME_STYLE: Record<string, string> = {
  tp1:     "bg-signal-buy/10 text-signal-buy",
  tp2:     "bg-signal-buy/20 text-signal-buy",
  tp3:     "bg-signal-buy/30 text-signal-buy",
  sl:      "bg-signal-sell/10 text-signal-sell",
  expired: "bg-surface-elevated text-text-muted",
};

export default function HistoryPage() {
  const { data: history, loading } = useSignalHistory();

  const wins   = history.filter((s) => ["tp1","tp2","tp3"].includes(s.outcome?.outcome ?? "")).length;
  const losses = history.filter((s) => s.outcome?.outcome === "sl").length;
  const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;

  return (
    <div className="flex flex-col h-screen bg-surface">
      <div className="border-b border-surface-border px-6 py-4">
        <Link href="/dashboard" className="text-xs text-text-muted hover:text-primary">← Dashboard</Link>
        <h1 className="text-lg font-bold text-text-primary mt-1">Signal History</h1>
      </div>

      {/* Stats bar */}
      <div className="flex gap-6 px-6 py-3 border-b border-surface-border text-sm">
        <div><span className="text-text-muted">Total </span><span className="font-mono text-text-primary">{history.length}</span></div>
        <div><span className="text-text-muted">Wins </span><span className="font-mono text-signal-buy">{wins}</span></div>
        <div><span className="text-text-muted">Losses </span><span className="font-mono text-signal-sell">{losses}</span></div>
        <div><span className="text-text-muted">Win rate </span><span className="font-mono text-text-primary">{winRate}%</span></div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <SectionErrorBoundary>
          {loading ? (
            <div className="space-y-2">
              {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-text-muted">No signal history yet</p>
              <p className="text-text-muted text-xs mt-1">Closed signals will appear here</p>
            </div>
          ) : (
            <div className="space-y-2 max-w-3xl">
              {history.map((signal) => (
                <div key={signal.id} className="flex items-center justify-between bg-surface-card border border-surface-border rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-text-primary w-20">{signal.instrument}</span>
                    <span className="text-xs text-text-muted w-8">{signal.timeframe}</span>
                    <span className={`text-xs font-bold ${signal.direction === "buy" ? "text-signal-buy" : "text-signal-sell"}`}>
                      {signal.direction.toUpperCase()}
                    </span>
                    <span className="text-xs text-text-muted">{signal.confidence}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {signal.outcome && (
                      <>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${OUTCOME_STYLE[signal.outcome.outcome] ?? ""}`}>
                          {signal.outcome.outcome.toUpperCase()}
                        </span>
                        {signal.outcome.rr_achieved && (
                          <span className="text-xs font-mono text-text-secondary">
                            R:R {signal.outcome.rr_achieved}
                          </span>
                        )}
                      </>
                    )}
                    <span className="text-xs text-text-muted">
                      {new Date(signal.fired_at).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionErrorBoundary>
      </div>
    </div>
  );
}
