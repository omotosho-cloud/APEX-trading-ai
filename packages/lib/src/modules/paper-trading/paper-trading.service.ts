import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../core/api-client";

export type PaperTradingMetrics = {
  totalSignals: number;
  activeCount: number;
  closedCount: number;
  accuracyRate: number;
  winRate: number;
  averageRR: number;
  netPnL: number;
  wins: number;
  losses: number;
  tp1Hits: number;
  tp2Hits: number;
  tp3Hits: number;
  slHits: number;
  tp1Accuracy: number;
  hoursRunning: number;
  bestPair: string | null;
  bestPairWinRate: number;
  bestTimeframe: string | null;
  bestTimeframeWinRate: number;
  performanceByInstrument: Record<
    string,
    { count: number; winRate: number; wins: number; losses: number }
  >;
  performanceByTimeframe: Record<
    string,
    { count: number; winRate: number; wins: number; losses: number }
  >;
  performanceByQuality: Record<
    string,
    { count: number; winRate: number; wins: number; losses: number }
  >;
};

export type SignalWithOutcome = {
  id: string;
  instrument: string;
  timeframe: string;
  direction: "buy" | "sell";
  confidence: number;
  entry_price: string;
  tp1_price: string;
  tp2_price: string;
  tp3_price: string | null;
  sl_price: string;
  rr_ratio: string;
  quality_tag: string | null;
  fired_at: string;
  is_active: boolean;
  outcome?: {
    id: string;
    signal_id: string;
    outcome: "WIN" | "LOSS" | "BREAKEVEN";
    exit_price: string | null;
    pips_gained: string | null;
    rr_achieved: string | null;
    duration_mins: number | null;
    closed_at: string;
  } | null;
};

export function usePaperTradingMetrics() {
  const { data, isLoading, error } = useQuery<{
    metrics: PaperTradingMetrics;
    activeSignals: SignalWithOutcome[];
    closedSignals: SignalWithOutcome[];
  }>({
    queryKey: ["paper-trading", "metrics"],
    queryFn: () => apiFetch("/api/paper-trading/metrics"),
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  return {
    metrics: data?.metrics || null,
    activeSignals: data?.activeSignals || [],
    closedSignals: data?.closedSignals || [],
    isLoading,
    error: error instanceof Error ? error.message : "Unknown error",
  };
}
