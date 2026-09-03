import { SearchParams, SearchResult } from '@shared/domain/search.types';
import { Worker } from '../entities/worker.entity';

/**
 * Every method here is implicitly scoped to the caller's organization: the
 * Prisma layer injects the tenant filter (see docs/09-multi-tenant.md), so no
 * signature carries an `organizationId`. A row belonging to another tenant is
 * simply not found.
 */
export interface WorkerRepositoryPort {
  search(params: SearchParams): Promise<SearchResult<Worker>>;
  findById(id: string): Promise<Worker | null>;
  save(worker: Worker): Promise<Worker>;
  delete(id: string): Promise<void>;
  /**
   * How many hours this person has already been paid for.
   *
   * Asked before every deletion, and the reason is in `schema.prisma`:
   * `timesheets.worker_id` cascades. Deleting a worker would therefore erase his
   * timesheets — and with them, silently, the labour cost of every worksite he
   * ever worked on. A closed month would change value with nothing to show for
   * it.
   */
  countTimesheets(workerId: string): Promise<number>;
}

export const WORKER_REPOSITORY_PORT = Symbol('WorkerRepositoryPort');
