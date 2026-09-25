import type { ICreateWorksite, IUpdateWorksite, IWorksite, WorksiteStatus } from '@chantia/shared';
import { apiFetch, type Paginated } from '@/shared/api/http-client';

/**
 * Where the worksite endpoints live — and the only place they do.
 *
 * Plain functions, no React: this module is callable from a test, a script or a
 * server handler without pulling a renderer in. The hooks that cache these calls
 * are next door in `worksite.queries.ts`, and they are the only consumer.
 *
 * Types come from `@chantia/shared`. Redeclaring `IWorksite` here would create a
 * second definition of the same contract, free to drift from the API's own.
 */

export interface WorksiteListParams {
  page?: number;
  limit?: number;
  /** Free text over name, code and client — matched server-side. */
  search?: string;
  /** Absent means every status. */
  status?: WorksiteStatus;
}

export function fetchWorksites(params?: WorksiteListParams): Promise<Paginated<IWorksite>> {
  const query = new URLSearchParams();
  if (params?.page) {
    query.set('page', String(params.page));
  }
  if (params?.limit) {
    query.set('limit', String(params.limit));
  }
  // Trimmed and dropped when empty, for the reason `worker.api.ts` gives.
  if (params?.search?.trim()) {
    query.set('search', params.search.trim());
  }
  if (params?.status) {
    query.set('status', params.status);
  }
  const suffix = query.size > 0 ? `?${query}` : '';
  return apiFetch<Paginated<IWorksite>>(`/worksites${suffix}`);
}

export function fetchWorksite(id: string): Promise<IWorksite> {
  return apiFetch<IWorksite>(`/worksites/${id}`);
}

export function createWorksite(payload: ICreateWorksite): Promise<IWorksite> {
  return apiFetch<IWorksite>('/worksites', { method: 'POST', data: payload });
}

export function updateWorksite(id: string, payload: IUpdateWorksite): Promise<IWorksite> {
  return apiFetch<IWorksite>(`/worksites/${id}`, { method: 'PATCH', data: payload });
}

/**
 * Never a real deletion — the API sets `deletedAt` and keeps the row, so the
 * hours and expenses recorded against it survive. From here it simply stops
 * appearing anywhere, and its code is free again.
 */
export function deleteWorksite(id: string): Promise<void> {
  return apiFetch<void>(`/worksites/${id}`, { method: 'DELETE' });
}
