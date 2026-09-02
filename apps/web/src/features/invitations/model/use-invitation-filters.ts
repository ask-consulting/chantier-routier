'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { InvitationStatus } from '@chantia/shared';
import type { InvitationListParams } from '../api/invitation.api';

/** How long the list waits after the last keystroke before asking the server. */
export const SEARCH_DEBOUNCE_MS = 300;

export interface InvitationFilters {
  /** What is in the box, updated on every keystroke. */
  search: string;
  status: InvitationStatus | 'all';
  setSearch: (value: string) => void;
  setStatus: (value: InvitationStatus | 'all') => void;
  clear: () => void;
  /** True while a filter is set — what an empty state needs to word itself. */
  isFiltering: boolean;
  /** What goes to the API: debounced search, and `all` translated to absent. */
  params: InvitationListParams;
}

/**
 * The filter state of the invitations screen.
 *
 * A hook rather than four `useState` in the page, and this is the moment
 * `docs/13` describes: the indirection was not worth it while the list carried a
 * single query, and it is now — because the debounce, the "all" convention and
 * the params object are one behaviour that a table, an empty state and a URL
 * will all eventually need to share.
 *
 * **The search is debounced, the box is not.** Typing stays instant; only the
 * request waits. Sending one call per keystroke would also change the cache key
 * per keystroke, filling React Query with entries nobody will ask for again.
 *
 * **`all` is a UI value, not an API one.** A `<select>` cannot hold "no value"
 * without an empty option that reads as a bug, so the absence is expressed here
 * and translated at the boundary.
 */
export function useInvitationFilters(): InvitationFilters {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<InvitationStatus | 'all'>('all');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const clear = useCallback(() => {
    setSearch('');
    setDebouncedSearch('');
    setStatus('all');
  }, []);

  const params = useMemo<InvitationListParams>(
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
    // Reads the *typed* value, not the debounced one: the empty state has to say
    // "no result for this search" the moment the result arrives, and the
    // debounced value is by then equal anyway.
    isFiltering: search.trim().length > 0 || status !== 'all',
    params,
  };
}
