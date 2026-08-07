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
 */
export interface WorksiteRepositoryPort {
  search(params: SearchParams): Promise<SearchResult<Worksite>>;
  findById(id: string): Promise<Worksite | null>;
  save(worksite: Worksite): Promise<Worksite>;
  delete(id: string): Promise<void>;
  /** Aggregation source for cost computation (timesheets joined with worker rates + expenses). */
  findCostInputs(worksiteId: string): Promise<WorksiteCostInputs>;
}

export const WORKSITE_REPOSITORY_PORT = Symbol('WorksiteRepositoryPort');
