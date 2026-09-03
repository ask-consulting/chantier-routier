/**
 * Worker aggregate root — the HR side of a person, never the login side.
 *
 * A worker has an hourly rate and timesheets; an account has an email and a
 * role. Most workers have no account (no smartphone on site), some accounts
 * belong to office staff with no worker record, and a site manager is both —
 * linked by `app_users.worker_id`, deliberately a soft reference so the identity
 * context stays extractable (see `schema.prisma`).
 *
 * Nothing here can authenticate, and nothing here should ever be able to.
 */
export class Worker {
  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly name: string,
    public readonly qualification: string | null,
    /** Cost of one hour of this person's time. Feeds every labour cost. */
    public readonly hourlyRate: number,
    public readonly active: boolean,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
  ) {}

  static create(props: {
    id: string;
    organizationId: string;
    name: string;
    qualification?: string | null;
    hourlyRate: number;
    active?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }): Worker {
    return new Worker(
      props.id,
      props.organizationId,
      props.name,
      props.qualification ?? null,
      props.hourlyRate,
      props.active ?? true,
      props.createdAt,
      props.updatedAt,
    );
  }

  /**
   * A changed copy.
   *
   * `undefined` means "leave it", `null` means "clear it" — which is why
   * `qualification` is the only field where the two differ, and why the check is
   * on `undefined` rather than falsy: a rate of `0` and an empty name are wrong,
   * but they are the *validator's* problem, not a reason to silently ignore the
   * change here.
   */
  with(changes: {
    name?: string;
    qualification?: string | null;
    hourlyRate?: number;
    active?: boolean;
  }): Worker {
    return new Worker(
      this.id,
      this.organizationId,
      changes.name ?? this.name,
      changes.qualification === undefined ? this.qualification : changes.qualification,
      changes.hourlyRate ?? this.hourlyRate,
      changes.active ?? this.active,
      this.createdAt,
      this.updatedAt,
    );
  }
}
