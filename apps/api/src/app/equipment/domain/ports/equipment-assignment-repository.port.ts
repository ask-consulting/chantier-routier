import { SearchParams, SearchResult } from '@shared/domain/search.types';
import { AssignmentWorksite, EquipmentAssignment } from '../entities/equipment-assignment.entity';

/**
 * Scoped to the caller's organization by the assignments' own
 * `organization_id` — see docs/09-multi-tenant.md. Reads load the machine
 * (to price the period) and the worksite (to name it).
 *
 * A real `delete`, unlike the fleet's aggregates: nothing hangs off an
 * assignment, and cancelling one is exactly removing it.
 */
export interface EquipmentAssignmentRepositoryPort {
  /** Filters: `equipmentId`, `worksiteId`. Chronological. */
  search(params: SearchParams): Promise<SearchResult<EquipmentAssignment>>;
  findById(id: string): Promise<EquipmentAssignment | null>;
  save(assignment: EquipmentAssignment): Promise<EquipmentAssignment>;
  delete(id: string): Promise<void>;

  /** The machine's assignments sharing at least one day with the period, but `excludeId`. */
  findOverlapping(
    equipmentId: string,
    period: { startDate: string; endDate: string },
    excludeId?: string,
  ): Promise<EquipmentAssignment[]>;
  /** How many of the machine's assignments reach outside `[from, until]`; `until: null` is open. */
  countOutside(equipmentId: string, from: string, until: string | null): Promise<number>;
  /** How many of the machine's assignments end on `day` or later. */
  countEndingFrom(equipmentId: string, day: string): Promise<number>;

  /** A current worksite of the caller's organization, named — or `null`. */
  findWorksite(worksiteId: string): Promise<AssignmentWorksite | null>;
}

export const EQUIPMENT_ASSIGNMENT_REPOSITORY_PORT = Symbol('EquipmentAssignmentRepositoryPort');
