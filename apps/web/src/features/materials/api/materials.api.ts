import type {
  ICreateOwnMaterial,
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
