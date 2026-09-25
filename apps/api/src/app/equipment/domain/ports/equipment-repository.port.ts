import { SearchParams, SearchResult } from '@shared/domain/search.types';
import { Equipment } from '../entities/equipment.entity';

/**
 * Every method is implicitly scoped to the caller's organization — see
 * docs/09-multi-tenant.md. **No `delete`**: removing a machine is
 * `save(equipment.deleted())`, and the reads exclude soft-deleted rows.
 */
export interface EquipmentRepositoryPort {
  /** Excludes soft-deleted rows. */
  search(params: SearchParams): Promise<SearchResult<Equipment>>;
  /** Excludes soft-deleted rows. */
  findById(id: string): Promise<Equipment | null>;
  /** Throws `FleetNumberTakenException` when a current machine holds the number. */
  save(equipment: Equipment): Promise<Equipment>;
}

export const EQUIPMENT_REPOSITORY_PORT = Symbol('EquipmentRepositoryPort');
