import { IPlanTemplate, IPlanTemplateSummary } from '@chantia/shared';

export const PLAN_TEMPLATE_CATALOG_PORT = Symbol('PLAN_TEMPLATE_CATALOG_PORT');

/** The reference plans: the same for every organization, read-only here. */
export interface PlanTemplateCatalogPort {
  list(): Promise<IPlanTemplateSummary[]>;
  findById(id: string): Promise<IPlanTemplate | null>;
}
