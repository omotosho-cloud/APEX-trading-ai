import { useApiQuery, useApiMutation } from "../../core/api-client";
import { WATCHLIST_KEY } from "../../core/query-keys";
import { MIN_5_CACHE_TIME } from "../../core/cache-config";
import { useQueryClient } from "@tanstack/react-query";

export function useWatchlist() {
  const query = useApiQuery<string[]>(
    [WATCHLIST_KEY],
    "/api/watchlist",
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

export function useAddToWatchlist() {
  const qc = useQueryClient();
  const mutation = useApiMutation<void, { instrument: string }>("/api/watchlist", "POST", {
    onSuccess: () => qc.invalidateQueries({ queryKey: [WATCHLIST_KEY] }),
  });
  return {
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
    addToWatchlist: async (instrument: string) => mutation.mutateAsync({ instrument }),
  };
}

export function useRemoveFromWatchlist() {
  const qc = useQueryClient();
  const mutation = useApiMutation<void, void>(
    "/api/watchlist/:instrument",
    "DELETE",
    { onSuccess: () => qc.invalidateQueries({ queryKey: [WATCHLIST_KEY] }) },
  );
  return {
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
    removeFromWatchlist: async () => mutation.mutateAsync(undefined),
  };
}
