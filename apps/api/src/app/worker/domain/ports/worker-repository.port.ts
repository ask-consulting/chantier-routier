import { SearchParams, SearchResult } from '@shared/domain/search.types';
import { Worker } from '../entities/worker.entity';

/**
 * Every method here is implicitly scoped to the caller's organization: the
 * Prisma layer injects the tenant filter (see docs/09-multi-tenant.md), so no
 * signature carries an `organizationId`. A row belonging to another tenant is
 * simply not found.
 *
 * **No `delete`.** `workers.deleted_at` exists precisely so nothing here ever
 * issues a real `DELETE` — see `schema.prisma`. Removing a worker is
 * `save(worker.deleted())`, the same write path as any other change; `search`
 * and `findById` are what keep a soft-deleted row from ever being seen again.
 */
export interface WorkerRepositoryPort {
  /** Excludes soft-deleted rows — `deleted_at is null` is not optional here. */
  search(params: SearchParams): Promise<SearchResult<Worker>>;
  /** Excludes soft-deleted rows too: a deleted worker must read as gone. */
  findById(id: string): Promise<Worker | null>;
  save(worker: Worker): Promise<Worker>;
}

export const WORKER_REPOSITORY_PORT = Symbol('WorkerRepositoryPort');
