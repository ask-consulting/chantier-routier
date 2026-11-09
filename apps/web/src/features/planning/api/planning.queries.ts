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

const planKey = (worksiteId: string) => ['planning', 'worksite', worksiteId] as const;

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: planKey(worksiteId) }),
  });
}

export function useDeleteWorksitePlan(worksiteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteWorksitePlan(worksiteId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: planKey(worksiteId) }),
  });
}

export function useUpdateWorksiteTask(worksiteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: IUpdateWorksiteTask }) =>
      updateWorksiteTask(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: planKey(worksiteId) }),
  });
}
