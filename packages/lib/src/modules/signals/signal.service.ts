import { useApiQuery } from "../../core/api-client";
import { SIGNAL_KEY, SIGNAL_HISTORY_KEY } from "../../core/query-keys";
import { MIN_5_CACHE_TIME, SEC_30_CACHE_TIME } from "../../core/cache-config";
import type { Signal, SignalOutcome } from "@apex/types";

export type SignalWithOutcome = Signal & { outcome?: SignalOutcome };

export function useActiveSignals() {
  const query = useApiQuery<Signal[]>(
    [SIGNAL_KEY, "active"],
    "/api/signals",
    { staleTime: SEC_30_CACHE_TIME, refetchInterval: 30_000 },
  );
  return {
    data: query.data ?? [],
    loading: query.isPending || query.isRefetching,
    isSuccess: query.isSuccess,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useSignalsByInstrument(instrument: string) {
  const query = useApiQuery<Signal[]>(
    [SIGNAL_KEY, instrument],
    `/api/signals/${instrument}`,
    { staleTime: SEC_30_CACHE_TIME, enabled: !!instrument },
  );
  return {
    data: query.data ?? [],
    loading: query.isPending || query.isRefetching,
    isSuccess: query.isSuccess,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useSignalHistory() {
  const query = useApiQuery<SignalWithOutcome[]>(
    [SIGNAL_HISTORY_KEY],
    "/api/signals/history",
    { staleTime: MIN_5_CACHE_TIME },
  );
  return {
    data: query.data ?? [],
    loading: query.isPending || query.isRefetching,
    isSuccess: query.isSuccess,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
