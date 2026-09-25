import { ExpenseCost, TimesheetCost } from '@chantia/shared';
import { SearchParams, SearchResult } from '@shared/domain/search.types';
import { Worksite } from '../entities/worksite.entity';

/** Raw inputs required to compute a worksite's actual cost. */
export interface WorksiteCostInputs {
  timesheets: TimesheetCost[];
  expenses: ExpenseCost[];
}

/**
 * Every method here is implicitly scoped to the caller's organization: the
 * Prisma layer injects the tenant filter (see docs/09-multi-tenant.md), so no
 * signature carries an `organizationId`. A row belonging to another tenant is
 * simply not found.
 *
 * **No `delete`.** `worksites.deleted_at` exists so nothing here ever issues a
 * real `DELETE` — timesheets and expenses cascade from it. Removing a worksite
 * is `save(worksite.deleted())`; `search` and `findById` are what keep a
 * soft-deleted row from ever being seen again.
 */
export interface WorksiteRepositoryPort {
  /** Excludes soft-deleted rows. */
  search(params: SearchParams): Promise<SearchResult<Worksite>>;
  /** Excludes soft-deleted rows too: a deleted worksite must read as gone. */
  findById(id: string): Promise<Worksite | null>;
  /** Throws `WorksiteCodeTakenException` when a current worksite holds the code. */
  save(worksite: Worksite): Promise<Worksite>;
  /**
   * Whether a worksite may point at this client: one of the caller's own
   * organization, not soft-deleted. The foreign key alone would accept
   * another tenant's client, or one nobody can see any more.
   */
  isAssignableClient(clientId: string): Promise<boolean>;
  /** Aggregation source for cost computation (timesheets joined with worker rates + expenses). */
  findCostInputs(worksiteId: string): Promise<WorksiteCostInputs>;
}

export const WORKSITE_REPOSITORY_PORT = Symbol('WorksiteRepositoryPort');
