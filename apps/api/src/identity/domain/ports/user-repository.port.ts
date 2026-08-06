import { SearchParams, SearchResult } from '@shared/domain/search.types';
import { User } from '../entities/user.entity';

/**
 * Scoped to the caller's organization by the Prisma layer (see
 * docs/09-multi-tenant.md), so no signature carries an `organizationId`: an
 * account of another tenant is simply not found.
 *
 * The exception is `findByEmail`, which login calls *before* any tenant is
 * known — an unauthenticated request runs unfiltered, so the lookup reaches
 * every organization, as it must.
 */
export interface UserRepositoryPort {
  /** Lookup by login identifier. The email is expected already normalised. */
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  search(params: SearchParams): Promise<SearchResult<User>>;
  /**
   * Guards the "an organization always keeps one way in" invariant, checked
   * before an admin is demoted, deactivated or deleted.
   */
  countActiveAdmins(): Promise<number>;
  save(user: User): Promise<User>;
  delete(id: string): Promise<void>;
}

export const USER_REPOSITORY_PORT = Symbol('UserRepositoryPort');
