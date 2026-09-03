'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { WorkerListParams } from '../api/worker.api';

/** How long the list waits after the last keystroke before asking the server. */
export const SEARCH_DEBOUNCE_MS = 300;

export type ActiveFilter = 'all' | 'active' | 'inactive';

export interface WorkerFilters {
  search: string;
  active: ActiveFilter;
  setSearch: (value: string) => void;
  setActive: (value: ActiveFilter) => void;
  clear: () => void;
  isFiltering: boolean;
  params: WorkerListParams;
}

/**
 * The filter state of the workers screen — same shape as
 * `use-invitation-filters.ts`, for the same two reasons.
 *
 * **The search is debounced, the box is not.** Typing stays instant; only the
 * request waits. One call per keystroke would also change the cache key per
 * keystroke, filling React Query with entries nobody will ask for again.
 *
 * **`all` is a UI value, not an API one.** The endpoint takes a plain boolean
 * or nothing; the third option a `<select>` needs is expressed here and
 * translated at the boundary.
 */
export function useWorkerFilters(): WorkerFilters {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [active, setActive] = useState<ActiveFilter>('all');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const clear = useCallback(() => {
    setSearch('');
    setDebouncedSearch('');
    setActive('all');
  }, []);

  const params = useMemo<WorkerListParams>(
    () => ({
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
      ...(active === 'all' ? {} : { active: active === 'active' }),
    }),
    [debouncedSearch, active],
  );

  return {
    search,
    active,
    setSearch,
    setActive,
    clear,
    // Reads the *typed* value, not the debounced one — see
    // `use-invitation-filters.ts` for why.
    isFiltering: search.trim().length > 0 || active !== 'all',
    params,
  };
}
