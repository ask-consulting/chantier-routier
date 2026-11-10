import { IWorksiteTask } from '@chantia/shared';
import { NewTask } from '../plan-tree';

export const WORKSITE_PLAN_REPOSITORY_PORT = Symbol('WORKSITE_PLAN_REPOSITORY_PORT');

export interface WorksitePeriod {
  start: string | null;
  end: string | null;
}

/** No tenant in any signature: the Prisma layer scopes these to the caller. */
export interface WorksitePlanRepositoryPort {
  /** `null` when the worksite does not exist for the caller. */
  findPeriod(worksiteId: string): Promise<WorksitePeriod | null>;
  /** The stored lines, as a tree. Lines with children hold no dates here. */
  findTree(worksiteId: string): Promise<IWorksiteTask[]>;
  /** Writes every line, unless the worksite has some. `false` when it does. */
  createIfEmpty(organizationId: string, worksiteId: string, tasks: NewTask[]): Promise<boolean>;
  deleteAll(worksiteId: string): Promise<void>;
  /** `null` when the line does not exist for the caller. */
  findTaskShape(id: string): Promise<{ hasChildren: boolean; worksiteId: string } | null>;
  updateDates(id: string, plannedStart: string, plannedEnd: string): Promise<void>;
  updateProgress(id: string, progress: number): Promise<void>;
}
