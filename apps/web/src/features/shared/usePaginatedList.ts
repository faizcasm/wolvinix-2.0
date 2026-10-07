import { keepPreviousData, useInfiniteQuery, type QueryKey } from "@tanstack/react-query";
import { getData } from "@/lib/api";
import type { PaginationMeta } from "@/types";

interface Page<T> {
  items: T[];
  meta?: PaginationMeta;
}

/**
 * Shared cursor-style pagination hook backed by `?page=&limit=` so every list
 * in the app behaves identically: incremental pages, no duplicate keys,
 * placeholder data while refetching.
 */
export function usePaginatedList<T>({
  queryKey,
  url,
  params = {},
  limit = 10,
  enabled = true,
}: {
  queryKey: QueryKey;
  url: string;
  params?: Record<string, string | number | boolean | undefined>;
  limit?: number;
  enabled?: boolean;
}) {
  return useInfiniteQuery<Page<T>, Error>({
    queryKey: [...queryKey, params],
    enabled,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const page = pageParam as number;
      const { data, meta } = await getData<T[]>(url, {
        params: { ...params, page, limit },
      });
      return { items: data, meta };
    },
    getNextPageParam: (lastPage) =>
      lastPage.meta?.hasMore ? (lastPage.meta.page ?? 0) + 1 : undefined,
    placeholderData: keepPreviousData,
  });
}

/** Flattens the infinite pages into a single array for rendering. */
export function flattenPages<T>(pages?: Page<T>[]): T[] {
  if (!pages) return [];
  return pages.flatMap((page) => page.items);
}

export type { Page };
