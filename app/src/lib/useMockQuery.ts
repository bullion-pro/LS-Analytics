import { keepPreviousData, useQuery } from "@tanstack/react-query";

/**
 * Wraps a synchronous mock-data selector in a simulated network round-trip so
 * pages exercise a real loading state on first mount. On refetch (filter
 * change), the previous render is kept (`isPlaceholderData`) rather than
 * replaced by a skeleton — the dataviz interaction rule: no flash, no jump.
 */
export function useMockQuery<T>(key: unknown[], selector: () => T, latencyMs = 380) {
  return useQuery({
    queryKey: key,
    queryFn: () => new Promise<T>((resolve) => setTimeout(() => resolve(selector()), latencyMs)),
    placeholderData: keepPreviousData,
  });
}
