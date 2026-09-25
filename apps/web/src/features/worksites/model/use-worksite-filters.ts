'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { WorksiteStatus } from '@chantia/shared';
import type { WorksiteListParams } from '../api/worksite.api';

/** How long the list waits after the last keystroke before asking the server. */
export const SEARCH_DEBOUNCE_MS = 300;

/** `all` is a UI value — the endpoint takes a status or nothing. */
export type StatusFilter = WorksiteStatus | 'all';

export interface WorksiteFilters {
  search: string;
  status: StatusFilter;
  setSearch: (value: string) => void;
  setStatus: (value: StatusFilter) => void;
  clear: () => void;
  isFiltering: boolean;
  params: WorksiteListParams;
}

/**
 * The filter state of the worksites screen — same shape as
 * `use-worker-filters.ts`, for the same reasons: the box is instant, the
 * request is debounced, and `all` is translated at the boundary.
 */
export function useWorksiteFilters(): WorksiteFilters {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const clear = useCallback(() => {
    setSearch('');
    setDebouncedSearch('');
    setStatus('all');
  }, []);

  const params = useMemo<WorksiteListParams>(
    () => ({
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
      ...(status === 'all' ? {} : { status }),
    }),
    [debouncedSearch, status],
  );

  return {
    search,
    status,
    setSearch,
    setStatus,
    clear,
    // The *typed* value, not the debounced one — see `use-worker-filters.ts`.
    isFiltering: search.trim().length > 0 || status !== 'all',
    params,
  };
}
