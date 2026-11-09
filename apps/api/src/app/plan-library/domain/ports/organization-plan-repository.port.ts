import { OrganizationPlan } from '../entities/organization-plan.entity';

export const ORGANIZATION_PLAN_REPOSITORY_PORT = Symbol('ORGANIZATION_PLAN_REPOSITORY_PORT');

/** No tenant in any signature: the Prisma layer scopes these to the caller. */
export interface OrganizationPlanRepositoryPort {
  findAll(): Promise<OrganizationPlan[]>;
  findById(id: string): Promise<OrganizationPlan | null>;
  create(plan: OrganizationPlan): Promise<void>;
  /** Writes the plan and replaces all its lines, in one transaction. */
  replace(plan: OrganizationPlan): Promise<void>;
  /** Returns false when the plan does not exist for the caller. */
  delete(id: string): Promise<boolean>;
}
