'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchWorksite, fetchWorksites, type WorksiteListParams } from './worksite.api';
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
 * Mutations arrive with the create/edit screens. The shape they will take:
 *
 *   export function useCreateWorksite() {
 *     const queryClient = useQueryClient();
 *     return useMutation({
 *       mutationFn: createWorksite,
 *       onSuccess: () => queryClient.invalidateQueries({ queryKey: worksiteKeys.all }),
 *     });
 *   }
 */

export function useWorksites(params?: WorksiteListParams) {
  return useQuery({
    queryKey: worksiteKeys.list(params),
    queryFn: () => fetchWorksites(params),
  });
}

export function useWorksite(id: string) {
  return useQuery({
    queryKey: worksiteKeys.detail(id),
    queryFn: () => fetchWorksite(id),
    enabled: Boolean(id),
  });
}
