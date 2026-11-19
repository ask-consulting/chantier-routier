import type {
  IAssignTaskWorker,
  IEquipmentAssignment,
  ITaskTeam,
  ITaskWorker,
  IWorker,
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

export function fetchTaskTeam(worksiteId: string): Promise<ITaskTeam> {
  return apiFetch<ITaskTeam>(`/worksites/${worksiteId}/task-team`);
}

export function assignTaskWorker(taskId: string, payload: IAssignTaskWorker): Promise<ITaskWorker> {
  return apiFetch<ITaskWorker>(`/worksite-tasks/${taskId}/workers`, {
    method: 'POST',
    data: payload,
  });
}

export function removeTaskWorker(id: string): Promise<void> {
  return apiFetch<void>(`/task-workers/${id}`, { method: 'DELETE' });
}

export function linkTaskEquipment(taskId: string, equipmentAssignmentId: string): Promise<void> {
  return apiFetch<void>(`/worksite-tasks/${taskId}/equipment`, {
    method: 'POST',
    data: { equipmentAssignmentId },
  });
}

export function unlinkTaskEquipment(id: string): Promise<void> {
  return apiFetch<void>(`/task-equipment/${id}`, { method: 'DELETE' });
}

/** The workers still on the payroll: who can be put on a task. */
export async function fetchActiveWorkers(): Promise<IWorker[]> {
  const page = await apiFetch<Paginated<IWorker>>('/workers?paginated=false&active=true');
  return page.items;
}
