import { ExpenseCost, TimesheetCost } from '@chantier/shared';
import { SearchParams, SearchResult } from '@shared/domain/search.types';
import { Worksite } from '../entities/worksite.entity';

/** Raw inputs required to compute a worksite's actual cost. */
export interface WorksiteCostInputs {
  timesheets: TimesheetCost[];
  expenses: ExpenseCost[];
}

export interface WorksiteRepositoryPort {
  search(organizationId: string, params: SearchParams): Promise<SearchResult<Worksite>>;
  findById(id: string): Promise<Worksite | null>;
  save(worksite: Worksite): Promise<Worksite>;
  delete(id: string): Promise<void>;
  /** Aggregation source for cost computation (timesheets joined with worker rates + expenses). */
  findCostInputs(worksiteId: string): Promise<WorksiteCostInputs>;
}

export const WORKSITE_REPOSITORY_PORT = Symbol('WorksiteRepositoryPort');
