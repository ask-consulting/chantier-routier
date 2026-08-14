import type { IWorksite } from '@chantia/shared';
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
}

export function fetchWorksites(params?: WorksiteListParams): Promise<Paginated<IWorksite>> {
  const query = new URLSearchParams();
  if (params?.page) {
    query.set('page', String(params.page));
  }
  if (params?.limit) {
    query.set('limit', String(params.limit));
  }
  const suffix = query.size > 0 ? `?${query}` : '';
  return apiFetch<Paginated<IWorksite>>(`/worksites${suffix}`);
}

export function fetchWorksite(id: string): Promise<IWorksite> {
  return apiFetch<IWorksite>(`/worksites/${id}`);
}
