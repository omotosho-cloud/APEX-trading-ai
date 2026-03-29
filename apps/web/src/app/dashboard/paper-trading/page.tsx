"use client";

import { useState, useEffect } from "react";

type Signal = {
  id: string;
  instrument: string;
  timeframe: string;
  direction: "buy" | "sell";
  confidence: number;
  entry_price: string;
  tp1_price: string;
  sl_price: string;
  fired_at: string;
};

type Metrics = {
  totalSignals: number;
  activeCount: number;
  closedCount: number;
  winRate: number;
  netPnL: number;
  wins: number;
  losses: number;
  tp1Accuracy: number;
  hoursRunning: number;
};

export default function PaperTradingPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [activeSignals, setActiveSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    try {
      const token = localStorage.getItem("sb-token");
      const res = await fetch("/api/paper-trading/metrics", {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setMetrics(data.metrics);
      setActiveSignals(data.activeSignals.slice(0, 10));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="p-8">Loading...</div>;
  if (!metrics)
    return <div className="p-8 text-red-500">Error loading data</div>;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-4">📊 Paper Trading Analytics</h1>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="bg-card rounded-lg border p-4">
          <div className="text-sm font-medium">Total Signals</div>
          <div className="text-2xl font-bold">{metrics.totalSignals}</div>
          <p className="text-xs text-muted-foreground">
            {metrics.activeCount} active
          </p>
        </div>

        <div className="bg-card rounded-lg border p-4">
          <div className="text-sm font-medium">Win Rate</div>
          <div className="text-2xl font-bold">
            {metrics.winRate.toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground">
            {metrics.wins}W / {metrics.losses}L
          </p>
        </div>

        <div className="bg-card rounded-lg border p-4">
          <div className="text-sm font-medium">Net P&L</div>
          <div
            className={`text-2xl font-bold ${metrics.netPnL >= 0 ? "text-green-500" : "text-red-500"}`}
          >
            {metrics.netPnL >= 0 ? "+" : ""}
            {metrics.netPnL.toFixed(2)}%
          </div>
        </div>

        <div className="bg-card rounded-lg border p-4">
          <div className="text-sm font-medium">TP1 Accuracy (Phase 3)</div>
          <div
            className={`text-2xl font-bold ${metrics.tp1Accuracy >= 50 ? "text-green-500" : "text-yellow-500"}`}
          >
            {metrics.tp1Accuracy.toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground">Target: &gt;50%</p>
        </div>
      </div>

      <div className="bg-card rounded-lg border p-6">
        <h2 className="text-xl font-bold mb-4">Active Signals</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Instrument</th>
              <th className="text-left py-2">TF</th>
              <th className="text-left py-2">Direction</th>
              <th className="text-left py-2">Confidence</th>
              <th className="text-left py-2">Entry</th>
              <th className="text-left py-2">TP1</th>
            </tr>
          </thead>
          <tbody>
            {activeSignals.map((s) => (
              <tr key={s.id} className="border-b">
                <td className="py-3 font-medium">{s.instrument}</td>
                <td>
                  <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                    {s.timeframe}
                  </span>
                </td>
                <td>
                  <span
                    className={`px-2 py-1 rounded text-xs text-white ${s.direction === "buy" ? "bg-blue-500" : "bg-red-500"}`}
                  >
                    {s.direction.toUpperCase()}
                  </span>
                </td>
                <td>{s.confidence}%</td>
                <td className="font-mono">
                  {parseFloat(s.entry_price).toFixed(5)}
                </td>
                <td className="font-mono text-green-600">
                  {parseFloat(s.tp1_price).toFixed(5)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
