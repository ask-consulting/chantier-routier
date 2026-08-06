import { SearchParams, SearchResult } from '@shared/domain/search.types';
import { User } from '../entities/user.entity';

export interface UserRepositoryPort {
  /** Lookup by login identifier. The email is expected already normalised. */
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  /** Scoped by tenant: an admin only ever lists their own organization. */
  search(organizationId: string, params: SearchParams): Promise<SearchResult<User>>;
  /**
   * Guards the "an organization always keeps one way in" invariant, checked
   * before an admin is demoted, deactivated or deleted.
   */
  countActiveAdmins(organizationId: string): Promise<number>;
  save(user: User): Promise<User>;
  delete(id: string): Promise<void>;
}

export const USER_REPOSITORY_PORT = Symbol('UserRepositoryPort');
