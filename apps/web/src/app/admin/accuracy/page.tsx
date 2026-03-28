"use client";

import { useApiQuery } from "@apex/lib";
import { EXPERT_ACCURACY_KEY, MIN_5_CACHE_TIME } from "@apex/lib";
import { SectionErrorBoundary, Skeleton, ConfidenceBar } from "@apex/ui";
import Link from "next/link";

type ExpertAccuracyRow = {
  id: string;
  expert_name: string;
  instrument: string;
  timeframe: string;
  regime: string;
  total_count: number;
  correct_count: number;
  accuracy_pct: number;
};

export default function AdminAccuracyPage() {
  const { data: rows = [], isPending } = useApiQuery<ExpertAccuracyRow[]>(
    [EXPERT_ACCURACY_KEY],
    "/api/admin/accuracy",
    { staleTime: MIN_5_CACHE_TIME },
  );

  const experts = [...new Set(rows.map((r) => r.expert_name))];

  return (
    <div className="min-h-screen bg-surface p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link href="/admin" className="text-xs text-text-muted hover:text-primary">← Admin</Link>
          <h1 className="text-xl font-bold text-text-primary mt-2">Expert Accuracy</h1>
          <p className="text-text-muted text-sm">{rows.length} data points across all experts</p>
        </div>

        <SectionErrorBoundary>
          {isPending ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : rows.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-text-muted">No accuracy data yet</p>
              <p className="text-text-muted text-xs mt-1">Data accumulates as signals close</p>
            </div>
          ) : (
            <div className="space-y-6">
              {experts.map((expert) => {
                const expertRows = rows.filter((r) => r.expert_name === expert);
                const avgAccuracy = expertRows.reduce((s, r) => s + Number(r.accuracy_pct), 0) / expertRows.length;
                return (
                  <div key={expert} className="bg-surface-card border border-surface-border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-semibold text-text-primary capitalize">{expert.replace("_", " ")} Expert</p>
                      <div className="flex items-center gap-2">
                        <ConfidenceBar value={avgAccuracy} className="w-24" />
                        <span className="text-xs font-mono text-text-secondary">{avgAccuracy.toFixed(1)}% avg</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {expertRows.slice(0, 10).map((r) => (
                        <div key={r.id} className="flex items-center gap-3 text-xs">
                          <span className="text-text-muted w-16">{r.instrument}</span>
                          <span className="text-text-muted w-8">{r.timeframe}</span>
                          <span className="text-text-muted w-24 truncate">{r.regime}</span>
                          <ConfidenceBar value={Number(r.accuracy_pct)} className="flex-1" />
                          <span className="font-mono text-text-secondary w-12 text-right">{Number(r.accuracy_pct).toFixed(0)}%</span>
                          <span className="text-text-muted w-12 text-right">n={r.total_count}</span>
                        </div>
                      ))}
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
