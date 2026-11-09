import type {
  IInitializeWorksitePlan,
  IOrganizationPlanSummary,
  IPlanTemplateSummary,
  IUpdateWorksiteTask,
  IWorksitePlan,
} from '@chantia/shared';
import { apiFetch } from '@/shared/api/http-client';

export function fetchWorksitePlan(worksiteId: string): Promise<IWorksitePlan> {
  return apiFetch<IWorksitePlan>(`/worksites/${worksiteId}/plan`);
}

export function initializeWorksitePlan(
  worksiteId: string,
  payload: IInitializeWorksitePlan,
): Promise<IWorksitePlan> {
  return apiFetch<IWorksitePlan>(`/worksites/${worksiteId}/plan`, {
    method: 'POST',
    data: payload,
  });
}

export function deleteWorksitePlan(worksiteId: string): Promise<void> {
  return apiFetch<void>(`/worksites/${worksiteId}/plan`, { method: 'DELETE' });
}

export function updateWorksiteTask(id: string, payload: IUpdateWorksiteTask): Promise<void> {
  return apiFetch<void>(`/worksite-tasks/${id}`, { method: 'PATCH', data: payload });
}

export function fetchPlanTemplates(): Promise<IPlanTemplateSummary[]> {
  return apiFetch<IPlanTemplateSummary[]>('/plan-templates');
}

export function fetchOrganizationPlans(): Promise<IOrganizationPlanSummary[]> {
  return apiFetch<IOrganizationPlanSummary[]>('/organization-plans');
}
