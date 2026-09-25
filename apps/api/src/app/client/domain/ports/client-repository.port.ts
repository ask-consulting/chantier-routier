import { SearchParams, SearchResult } from '@shared/domain/search.types';
import { Client } from '../entities/client.entity';

/**
 * Every method is implicitly scoped to the caller's organization through the
 * `clients` table — see docs/09-multi-tenant.md. Contacts are reached only
 * through their client, never on their own.
 *
 * **No `delete`**: removing a client is `save(client.deleted())`, like
 * workers and worksites. `search` and `findById` exclude soft-deleted rows.
 */
export interface ClientRepositoryPort {
  /** Excludes soft-deleted rows. Contacts included, primary first. */
  search(params: SearchParams): Promise<SearchResult<Client>>;
  /** Excludes soft-deleted rows. Contacts included, primary first. */
  findById(id: string): Promise<Client | null>;
  /**
   * Writes the client and makes its contacts exactly `client.contacts`, in one
   * transaction: contacts left out are deleted, new ones created, the rest
   * updated — only ever among this client's own contacts.
   */
  save(client: Client): Promise<Client>;
  /** Current (not soft-deleted) worksites pointing at this client. */
  countActiveWorksites(clientId: string): Promise<number>;
}

export const CLIENT_REPOSITORY_PORT = Symbol('ClientRepositoryPort');
