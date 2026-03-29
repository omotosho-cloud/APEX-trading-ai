"use client";

import { useApiQuery } from "@apex/lib";
import { ADMIN_SIGNALS_KEY } from "@apex/lib";
import { MIN_5_CACHE_TIME } from "@apex/lib";
import { SectionErrorBoundary, Skeleton } from "@apex/ui";
import Link from "next/link";
import type { Signal } from "@apex/types";

export default function AdminSignalsPage() {
  const { data: signals = [], isPending } = useApiQuery<Signal[]>(
    [ADMIN_SIGNALS_KEY],
    "/api/admin/signals",
    { staleTime: MIN_5_CACHE_TIME },
  );

  const byInstrument = signals.reduce<Record<string, Signal[]>>((acc, s) => {
    acc[s.instrument] = [...(acc[s.instrument] ?? []), s];
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-surface p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link href="/admin" className="text-xs text-text-muted hover:text-primary">← Admin</Link>
          <h1 className="text-xl font-bold text-text-primary mt-2">All Signals</h1>
          <p className="text-text-muted text-sm">{signals.length} total signals</p>
        </div>

        <SectionErrorBoundary>
          {isPending ? (
            <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <div className="space-y-2">
              {signals.slice(0, 100).map((s) => (
                <div key={s.id} className="flex items-center justify-between bg-surface-card border border-surface-border rounded-xl px-4 py-3 text-sm">
                  <div className="flex items-center gap-4">
                    <span className="font-medium text-text-primary w-20">{s.instrument}</span>
                    <span className="text-text-muted w-8">{s.timeframe}</span>
                    <span className={`font-bold ${s.direction === "buy" ? "text-signal-buy" : "text-signal-sell"}`}>
                      {s.direction.toUpperCase()}
                    </span>
                    <span className="text-text-muted">{s.confidence}%</span>
                    <span className="text-text-muted text-xs">{s.regime}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === "ACTIVE" ? "bg-signal-buy/10 text-signal-buy" : "bg-surface-elevated text-text-muted"}`}>
                      {s.status}
                    </span>
                    <span className="text-xs text-text-muted">
                      {new Date(s.fired_at).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
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
