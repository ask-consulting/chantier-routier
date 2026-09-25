import { WorksiteStatus } from '@chantia/shared';

/** The fields a caller may change on a worksite — see `Worksite.with`. */
export interface WorksiteChanges {
  code?: string;
  name?: string;
  client?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  plannedStartDate?: Date | null;
  plannedEndDate?: Date | null;
  status?: WorksiteStatus;
  totalBudget?: number | null;
}

/** Worksite aggregate root. */
export class Worksite {
  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly code: string,
    public readonly name: string,
    public readonly client: string | null,
    public readonly address: string | null,
    public readonly latitude: number | null,
    public readonly longitude: number | null,
    public readonly plannedStartDate: Date | null,
    public readonly plannedEndDate: Date | null,
    public readonly status: WorksiteStatus,
    public readonly totalBudget: number | null,
    /**
     * When this worksite was removed, or `null` while current.
     *
     * Set instead of an actual row delete: `timesheets.worksite_id` and
     * `expenses.worksite_id` cascade, so a real `DELETE` would erase the hours
     * and the receipts with it — hours somebody was paid for. The row survives
     * on purpose; only the repository's reads know to filter it out.
     *
     * Not a status: `completed` and `suspended` are what a site manager
     * *chooses*, and they stay visible. This one is "created by mistake", and
     * is not.
     */
    public readonly deletedAt: Date | null = null,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
  ) {}

  static create(props: {
    id: string;
    organizationId: string;
    code: string;
    name: string;
    client?: string | null;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    plannedStartDate?: Date | null;
    plannedEndDate?: Date | null;
    status?: WorksiteStatus;
    totalBudget?: number | null;
    deletedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  }): Worksite {
    return new Worksite(
      props.id,
      props.organizationId,
      props.code,
      props.name,
      props.client ?? null,
      props.address ?? null,
      props.latitude ?? null,
      props.longitude ?? null,
      props.plannedStartDate ?? null,
      props.plannedEndDate ?? null,
      props.status ?? WorksiteStatus.UPCOMING,
      props.totalBudget ?? null,
      props.deletedAt ?? null,
      props.createdAt,
      props.updatedAt,
    );
  }

  isDeleted(): boolean {
    return this.deletedAt !== null;
  }

  /**
   * Whether the planned end falls on or after the planned start.
   *
   * A question rather than a check in `create`: the mapper builds entities
   * from rows written before the rule existed, and reading one back must not
   * throw. The command handlers ask it before writing.
   */
  hasConsistentSchedule(): boolean {
    if (!this.plannedStartDate || !this.plannedEndDate) {
      return true;
    }
    return this.plannedEndDate.getTime() >= this.plannedStartDate.getTime();
  }

  /**
   * A changed copy.
   *
   * `undefined` means "leave it", `null` means "clear it" — hence the check on
   * `undefined` for every nullable field, rather than `??`, which would make a
   * cleared address impossible to express.
   */
  with(changes: WorksiteChanges): Worksite {
    const pick = <T>(next: T | undefined, current: T): T => (next === undefined ? current : next);

    return new Worksite(
      this.id,
      this.organizationId,
      changes.code ?? this.code,
      changes.name ?? this.name,
      pick(changes.client, this.client),
      pick(changes.address, this.address),
      pick(changes.latitude, this.latitude),
      pick(changes.longitude, this.longitude),
      pick(changes.plannedStartDate, this.plannedStartDate),
      pick(changes.plannedEndDate, this.plannedEndDate),
      changes.status ?? this.status,
      pick(changes.totalBudget, this.totalBudget),
      this.deletedAt,
      this.createdAt,
      this.updatedAt,
    );
  }

  /**
   * Marks this worksite removed, without discarding it.
   *
   * The only state change `DELETE /worksites/:id` ever makes — there is no
   * path in this module that issues a real `DELETE` statement.
   */
  deleted(at: Date = new Date()): Worksite {
    return new Worksite(
      this.id,
      this.organizationId,
      this.code,
      this.name,
      this.client,
      this.address,
      this.latitude,
      this.longitude,
      this.plannedStartDate,
      this.plannedEndDate,
      this.status,
      this.totalBudget,
      at,
      this.createdAt,
      this.updatedAt,
    );
  }
}
