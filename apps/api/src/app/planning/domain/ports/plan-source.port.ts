import { SourcePlan } from '../plan-tree';

export const PLAN_SOURCE_PORT = Symbol('PLAN_SOURCE_PORT');

/** Where a planning can start from. `null` for what does not exist for the caller. */
export interface PlanSourcePort {
  findTemplate(id: string, locale: string): Promise<SourcePlan | null>;
  findOrganizationPlan(id: string): Promise<SourcePlan | null>;
}
