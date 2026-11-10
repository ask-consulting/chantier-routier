import type {
  IEquipmentAssignment,
  IMyWorksite,
  IUser,
  IWorksiteMember,
  IWorksitePlan,
} from '@chantia/shared';
import { apiFetch, type Paginated } from '@/shared/api/http-client';

export function fetchMyWorksites(): Promise<IMyWorksite[]> {
  return apiFetch<IMyWorksite[]>('/my-worksites');
}

export function fetchMyWorksite(id: string): Promise<IMyWorksite> {
  return apiFetch<IMyWorksite>(`/my-worksites/${id}`);
}

export function fetchPlan(worksiteId: string): Promise<IWorksitePlan> {
  return apiFetch<IWorksitePlan>(`/worksites/${worksiteId}/plan`);
}

export function updateTaskProgress(taskId: string, progress: number): Promise<void> {
  return apiFetch<void>(`/worksite-tasks/${taskId}/progress`, {
    method: 'PATCH',
    data: { progress },
  });
}

export function fetchMembers(worksiteId: string): Promise<IWorksiteMember[]> {
  return apiFetch<IWorksiteMember[]>(`/worksites/${worksiteId}/members`);
}

export function setMembers(worksiteId: string, userIds: string[]): Promise<void> {
  return apiFetch<void>(`/worksites/${worksiteId}/members`, { method: 'PUT', data: { userIds } });
}

/** The organization's active accounts: who can be put on a worksite. */
export async function fetchAccounts(): Promise<IUser[]> {
  const page = await apiFetch<Paginated<IUser>>('/users?paginated=false&active=true');
  return page.items;
}

export async function fetchAssignments(worksiteId: string): Promise<IEquipmentAssignment[]> {
  const page = await apiFetch<Paginated<IEquipmentAssignment>>(
    `/equipment-assignments?worksiteId=${worksiteId}&limit=100`,
  );
  return page.items;
}
