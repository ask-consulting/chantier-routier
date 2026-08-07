import { Organization } from '../entities/organization.entity';
import { User } from '../entities/user.entity';

export interface OrganizationRepositoryPort {
  findById(id: string): Promise<Organization | null>;
  save(organization: Organization): Promise<Organization>;
  /**
   * Provisions a tenant and its first admin in a single transaction.
   *
   * Sign-up spans two aggregates and must be all-or-nothing: an organization
   * with no way to log into it is unrecoverable dead data, and an account
   * pointing at a missing tenant breaks every subsequent query.
   */
  createWithOwner(
    organization: Organization,
    owner: User,
  ): Promise<{ organization: Organization; owner: User }>;
}

export const ORGANIZATION_REPOSITORY_PORT = Symbol('OrganizationRepositoryPort');
