'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ClientType } from '@chantia/shared';
import type { ClientListParams } from '../api/client.api';

/** How long the list waits after the last keystroke before asking the server. */
export const SEARCH_DEBOUNCE_MS = 300;

/** `all` is a UI value — the endpoint takes a type or nothing. */
export type TypeFilter = ClientType | 'all';

/**
 * The filter state of the clients screen — same shape as
 * `use-worker-filters.ts`: the box is instant, the request debounced.
 */
export function useClientFilters() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [type, setType] = useState<TypeFilter>('all');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const clear = useCallback(() => {
    setSearch('');
    setDebouncedSearch('');
    setType('all');
  }, []);

  const params = useMemo<ClientListParams>(
    () => ({
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
      ...(type === 'all' ? {} : { type }),
    }),
    [debouncedSearch, type],
  );

  return {
    search,
    type,
    setSearch,
    setType,
    clear,
    isFiltering: search.trim().length > 0 || type !== 'all',
    params,
  };
}
