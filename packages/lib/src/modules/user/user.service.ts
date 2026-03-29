import { useApiQuery, useApiMutation } from "../../core/api-client";
import { USER_KEY } from "../../core/query-keys";
import { MIN_5_CACHE_TIME } from "../../core/cache-config";
import { useQueryClient } from "@tanstack/react-query";
import type { User, UpdateUserSettings } from "@apex/types";

export function useUserSettings() {
  const query = useApiQuery<User>(
    [USER_KEY, "settings"],
    "/api/user/settings",
    { staleTime: MIN_5_CACHE_TIME },
  );
  return {
    data: query.data ?? null,
    loading: query.isPending || query.isRefetching,
    isSuccess: query.isSuccess,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useUpdateUserSettings() {
  const qc = useQueryClient();
  const mutation = useApiMutation<User, UpdateUserSettings>(
    "/api/user/settings",
    "PATCH",
    { onSuccess: () => qc.invalidateQueries({ queryKey: [USER_KEY] }) },
  );
  return {
    isLoading: mutation.isPending,
    data: mutation.data ?? null,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
    updateSettings: async (input: UpdateUserSettings) => mutation.mutateAsync(input),
  };
}
