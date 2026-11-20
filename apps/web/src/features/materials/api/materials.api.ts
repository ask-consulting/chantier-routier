import type {
  ICreateOwnMaterial,
  IPlanTaskMaterial,
  ITaskMaterial,
  IUpdateTaskMaterial,
  IWorksitePlan,
  IMaterialCategory,
  IOwnMaterial,
  IUpdateOwnMaterial,
} from '@chantia/shared';
import { apiFetch } from '@/shared/api/http-client';

export function fetchMaterialCatalog(): Promise<IMaterialCategory[]> {
  return apiFetch<IMaterialCategory[]>('/material-catalog');
}

export function fetchOwnMaterials(): Promise<IOwnMaterial[]> {
  return apiFetch<IOwnMaterial[]>('/materials');
}

export function createOwnMaterial(data: ICreateOwnMaterial): Promise<IOwnMaterial> {
  return apiFetch<IOwnMaterial>('/materials', { method: 'POST', data });
}

export function updateOwnMaterial(id: string, data: IUpdateOwnMaterial): Promise<IOwnMaterial> {
  return apiFetch<IOwnMaterial>(`/materials/${id}`, { method: 'PATCH', data });
}

export function removeOwnMaterial(id: string): Promise<void> {
  return apiFetch<void>(`/materials/${id}`, { method: 'DELETE' });
}

/** A worksite's plan, for its tasks: cached under the planning feature's key. */
export function fetchWorksitePlan(worksiteId: string): Promise<IWorksitePlan> {
  return apiFetch<IWorksitePlan>(`/worksites/${worksiteId}/plan`);
}

export function fetchTaskMaterials(worksiteId: string): Promise<ITaskMaterial[]> {
  return apiFetch<ITaskMaterial[]>(`/worksites/${worksiteId}/task-materials`);
}

export function planTaskMaterial(taskId: string, data: IPlanTaskMaterial): Promise<ITaskMaterial> {
  return apiFetch<ITaskMaterial>(`/worksite-tasks/${taskId}/materials`, { method: 'POST', data });
}

export function updateTaskMaterial(id: string, data: IUpdateTaskMaterial): Promise<ITaskMaterial> {
  return apiFetch<ITaskMaterial>(`/task-materials/${id}`, { method: 'PATCH', data });
}

export function removeTaskMaterial(id: string): Promise<void> {
  return apiFetch<void>(`/task-materials/${id}`, { method: 'DELETE' });
}
