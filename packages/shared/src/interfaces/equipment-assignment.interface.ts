import type { EquipmentCostInput } from '../equipment/equipment-costs';

/**
 * A machine assigned to a worksite for a fixed period — the link that makes a
 * machine's daily cost part of a worksite's cost.
 *
 * `cost` and `pricing` are money: **omitted entirely** for a caller without
 * `budget:read`.
 */
export interface IEquipmentAssignment {
  id: string;
  organizationId: string;
  equipmentId: string;
  worksiteId: string;
  /** `YYYY-MM-DD`, first day on the worksite. */
  startDate: string;
  /** `YYYY-MM-DD`, last day on the worksite, included. */
  endDate: string;
  /** Calendar days, both ends included. */
  days: number;
  notes: string | null;
  equipment: { id: string; designation: string; typeCode: string; fleetNumber: string | null };
  worksite: { id: string; code: string; name: string };
  /**
   * What the machine costs the worksite over the period — stored, computed
   * from `pricing` when the assignment was made or its dates last changed.
   */
  cost?: number;
  /**
   * The machine's pricing as it stood when the assignment was made. A rate
   * changed on the machine since applies to the next assignments, not this one.
   */
  pricing?: EquipmentCostInput;
  createdAt?: string;
  updatedAt?: string;
}

export interface ICreateEquipmentAssignment {
  equipmentId: string;
  worksiteId: string;
  startDate: string;
  endDate: string;
  notes?: string | null;
}

/** Moving an assignment to another worksite, or other dates. The machine stays. */
export interface IUpdateEquipmentAssignment {
  worksiteId?: string;
  startDate?: string;
  endDate?: string;
  notes?: string | null;
}
