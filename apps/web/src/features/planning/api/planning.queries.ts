'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { IInitializeWorksitePlan, IUpdateWorksiteTask } from '@chantia/shared';
import {
  deleteWorksitePlan,
  fetchOrganizationPlans,
  fetchPlanTemplates,
  fetchWorksitePlan,
  initializeWorksitePlan,
  updateWorksiteTask,
} from './planning.api';

/**
 * A worksite's plan. Exported: « Mes chantiers » reads the same plan, and must
 * read it from the same cache entry, or a change made here leaves it stale.
 */
export const planKey = (worksiteId: string) => ['planning', 'worksite', worksiteId] as const;

/**
 * « Mes chantiers » sums the plan up (progress, phases, next steps): a change to
 * the plan changes that too. A literal, not an import: that feature reads this
 * one, and the two indexes must not import each other.
 */
const MY_WORKSITES = ['my-worksites'] as const;

export function useWorksitePlan(worksiteId: string) {
  return useQuery({
    queryKey: planKey(worksiteId),
    queryFn: () => fetchWorksitePlan(worksiteId),
  });
}

export function usePlanSources(enabled: boolean) {
  const templates = useQuery({
    queryKey: ['planning', 'templates'],
    queryFn: fetchPlanTemplates,
    enabled,
  });
  const organizationPlans = useQuery({
    queryKey: ['planning', 'organization-plans'],
    queryFn: fetchOrganizationPlans,
    enabled,
  });
  return { templates, organizationPlans };
}

export function useInitializeWorksitePlan(worksiteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: IInitializeWorksitePlan) => initializeWorksitePlan(worksiteId, payload),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: planKey(worksiteId) }),
        queryClient.invalidateQueries({ queryKey: MY_WORKSITES }),
      ]),
  });
}

export function useDeleteWorksitePlan(worksiteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteWorksitePlan(worksiteId),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: planKey(worksiteId) }),
        queryClient.invalidateQueries({ queryKey: MY_WORKSITES }),
      ]),
  });
}

export function useUpdateWorksiteTask(worksiteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: IUpdateWorksiteTask }) =>
      updateWorksiteTask(id, data),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: planKey(worksiteId) }),
        queryClient.invalidateQueries({ queryKey: MY_WORKSITES }),
      ]),
  });
}
