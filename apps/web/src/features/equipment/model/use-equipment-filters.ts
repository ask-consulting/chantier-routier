'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { EquipmentCategory, EquipmentStatus } from '@chantia/shared';
import type { EquipmentListParams } from '../api/equipment.api';

/** How long the list waits after the last keystroke before asking the server. */
export const SEARCH_DEBOUNCE_MS = 300;

export type CategoryFilter = EquipmentCategory | 'all';
export type StatusFilter = EquipmentStatus | 'all';

/** The filter state of the fleet screen — same shape as the other lists'. */
export function useEquipmentFilters() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const clear = useCallback(() => {
    setSearch('');
    setDebouncedSearch('');
    setCategory('all');
    setStatus('all');
  }, []);

  const params = useMemo<EquipmentListParams>(
    () => ({
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
      ...(category === 'all' ? {} : { category }),
      ...(status === 'all' ? {} : { status }),
    }),
    [debouncedSearch, category, status],
  );

  return {
    search,
    category,
    status,
    setSearch,
    setCategory,
    setStatus,
    clear,
    isFiltering: search.trim().length > 0 || category !== 'all' || status !== 'all',
    params,
  };
}
