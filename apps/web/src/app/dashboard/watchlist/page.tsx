"use client";

import { useWatchlist, useRemoveFromWatchlist, useActiveSignals } from "@apex/lib";
import { SectionErrorBoundary, Skeleton } from "@apex/ui";
import Link from "next/link";

export default function WatchlistPage() {
  const { data: watchlist, loading } = useWatchlist();
  const { data: signals } = useActiveSignals();
  const { removeFromWatchlist } = useRemoveFromWatchlist();

  return (
    <div className="flex flex-col h-screen bg-surface">
      <div className="border-b border-surface-border px-6 py-4 flex items-center justify-between">
        <div>
          <Link href="/dashboard" className="text-xs text-text-muted hover:text-primary">← Dashboard</Link>
          <h1 className="text-lg font-bold text-text-primary mt-1">Watchlist</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <SectionErrorBoundary>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : watchlist.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-text-muted">No pairs in your watchlist</p>
              <Link href="/dashboard" className="text-primary text-sm hover:underline mt-2 block">
                Go to dashboard to add pairs
              </Link>
            </div>
          ) : (
            <div className="space-y-2 max-w-2xl">
              {watchlist.map((instrument) => {
                const pairSignals = signals.filter((s) => s.instrument === instrument);
                const buys  = pairSignals.filter((s) => s.direction === "buy").length;
                const sells = pairSignals.filter((s) => s.direction === "sell").length;
                const bias  = buys > sells ? "BUY" : sells > buys ? "SELL" : "───";
                const biasColor = bias === "BUY" ? "text-signal-buy" : bias === "SELL" ? "text-signal-sell" : "text-text-muted";

                return (
                  <div key={instrument} className="flex items-center justify-between bg-surface-card border border-surface-border rounded-xl px-4 py-3">
                    <div className="flex items-center gap-4">
                      <span className="font-medium text-text-primary">{instrument}</span>
                      <span className={`text-sm font-bold ${biasColor}`}>{bias}</span>
                      <span className="text-xs text-text-muted">{pairSignals.length} active signals</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Link href={`/dashboard?pair=${instrument}`} className="text-xs text-primary hover:underline">
                        View signals
                      </Link>
                      <button
                        onClick={() => removeFromWatchlist()}
                        className="text-xs text-signal-sell hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionErrorBoundary>
      </div>
    </div>
  );
}
