'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { IUpdateWorksite } from '@chantia/shared';
import {
  createWorksite,
  deleteWorksite,
  fetchWorksite,
  fetchWorksites,
  updateWorksite,
  type WorksiteListParams,
} from './worksite.api';
import { worksiteKeys } from './worksite.keys';

/**
 * The React-facing side of the worksite endpoints.
 *
 * One rule holds this layer together: **every write goes through a mutation
 * defined here, and that mutation owns its invalidation.** No component calls
 * `worksite.api` directly, and no second path — a server action, a manual fetch
 * — writes behind React Query's back. The moment two paths exist, one of them
 * forgets to invalidate and the list quietly serves stale rows.
 *
 * All three writes invalidate `worksiteKeys.all` — lists *and* details, by
 * prefix: an edit changes the row and the detail alike, a delete removes both.
 *
 * `placeholderData` keeps the previous page on screen while a filter is
 * applied, so typing does not blink the table away between keystrokes.
 */

export function useWorksites(params?: WorksiteListParams) {
  return useQuery({
    queryKey: worksiteKeys.list(params),
    queryFn: () => fetchWorksites(params),
    placeholderData: (previous) => previous,
  });
}

export function useWorksite(id: string) {
  return useQuery({
    queryKey: worksiteKeys.detail(id),
    queryFn: () => fetchWorksite(id),
    enabled: Boolean(id),
  });
}

export function useCreateWorksite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createWorksite,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: worksiteKeys.all }),
  });
}

export function useUpdateWorksite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: IUpdateWorksite }) => updateWorksite(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: worksiteKeys.all }),
  });
}

export function useDeleteWorksite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteWorksite,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: worksiteKeys.all }),
  });
}
