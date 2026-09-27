import {
  daysBetweenInclusive,
  equipmentCostOverPeriod,
  type EquipmentCostInput,
} from '@chantia/shared';
import { InvalidAssignmentException } from '../exceptions/equipment-assignment.exceptions';
import { Equipment } from './equipment.entity';

/** The worksite as far as an assignment needs it: enough to name it. */
export interface AssignmentWorksite {
  id: string;
  code: string;
  name: string;
}

export interface EquipmentAssignmentProps {
  id: string;
  organizationId: string;
  equipmentId: string;
  worksiteId: string;
  /** `YYYY-MM-DD`, first day on the worksite. */
  startDate: string;
  /** `YYYY-MM-DD`, last day on the worksite, included. */
  endDate: string;
  /** The machine's pricing when the assignment was made — see `pricing` below. */
  pricing: EquipmentCostInput;
  /**
   * The cost stored with it. Absent for a new assignment, or one whose dates
   * just changed: it is then computed from `pricing`.
   */
  cost?: number;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * A machine on a worksite for a fixed period, both ends included — its own
 * aggregate, so moving a machine never rewrites the machine itself.
 *
 * It knows its own shape (a period that runs forwards). What depends on the
 * rest of the fleet — the machine being there at all over those days, and
 * nowhere else — is checked by the command handlers, which can see the rest.
 *
 * **It keeps the price it was made at.** `pricing` is the machine's pricing as
 * it stood then, and `cost` what that pricing makes of the period — stored, so
 * a rate changed on the machine later (a rental going up) applies to the next
 * assignments and never rewrites what a worksite already cost. New dates are
 * priced with the same agreed pricing; a new rate means a new assignment.
 *
 * `equipment` and `worksite` are loaded with it on reads, to name them; after
 * a change the worksite is dropped until read back.
 */
export class EquipmentAssignment {
  private constructor(
    private readonly props: Required<Omit<EquipmentAssignmentProps, 'createdAt' | 'updatedAt'>> &
      Pick<EquipmentAssignmentProps, 'createdAt' | 'updatedAt'>,
    public readonly equipment: Equipment | null,
    public readonly worksite: AssignmentWorksite | null,
  ) {}

  static create(
    input: EquipmentAssignmentProps,
    loaded: { equipment?: Equipment | null; worksite?: AssignmentWorksite | null } = {},
  ): EquipmentAssignment {
    const startDate = input.startDate.slice(0, 10);
    const endDate = input.endDate.slice(0, 10);
    if (endDate < startDate) {
      throw new InvalidAssignmentException('endDate', 'endBeforeStart', 'The period ends before it starts');
    }
    return new EquipmentAssignment(
      {
        ...input,
        startDate,
        endDate,
        pricing: input.pricing,
        cost: input.cost ?? equipmentCostOverPeriod(input.pricing, startDate, endDate),
        notes: input.notes?.trim() ? input.notes.trim() : null,
      },
      loaded.equipment ?? null,
      loaded.worksite ?? null,
    );
  }

  get id(): string {
    return this.props.id;
  }
  get organizationId(): string {
    return this.props.organizationId;
  }
  get equipmentId(): string {
    return this.props.equipmentId;
  }
  get worksiteId(): string {
    return this.props.worksiteId;
  }
  get startDate(): string {
    return this.props.startDate;
  }
  get endDate(): string {
    return this.props.endDate;
  }
  get notes(): string | null {
    return this.props.notes;
  }
  get createdAt(): Date | undefined {
    return this.props.createdAt;
  }
  get updatedAt(): Date | undefined {
    return this.props.updatedAt;
  }

  /** Calendar days on the worksite, both ends included. */
  get days(): number {
    return daysBetweenInclusive(this.startDate, this.endDate);
  }

  /** The pricing agreed when the assignment was made. */
  get pricing(): EquipmentCostInput {
    return this.props.pricing;
  }

  /** What the machine costs the worksite over the period, at the agreed pricing. */
  get cost(): number {
    return this.props.cost;
  }

  /** A changed copy. Loaded relations are dropped — they may no longer match. */
  with(changes: {
    worksiteId?: string;
    startDate?: string;
    endDate?: string;
    notes?: string | null;
  }): EquipmentAssignment {
    const worksiteChanged =
      changes.worksiteId !== undefined && changes.worksiteId !== this.worksiteId;
    const startDate = changes.startDate ?? this.startDate;
    const endDate = changes.endDate ?? this.endDate;
    const datesChanged = startDate !== this.startDate || endDate !== this.endDate;
    return EquipmentAssignment.create(
      {
        ...this.props,
        worksiteId: changes.worksiteId ?? this.worksiteId,
        startDate,
        endDate,
        // Same pricing either way; the cost is recomputed only for new dates.
        cost: datesChanged ? undefined : this.cost,
        notes: changes.notes === undefined ? this.notes : changes.notes,
      },
      { equipment: this.equipment, worksite: worksiteChanged ? null : this.worksite },
    );
  }
}
