/**
 * A worker record was removed from the payroll.
 *
 * Published by the business side, consumed by identity — which is the only way
 * the two can speak. The wall in `eslint.config.mjs` forbids either from
 * importing the other, and it is not decoration: `identity/` is meant to leave
 * as its own service, and on that day this event becomes a message on a queue
 * rather than a call in the same process.
 *
 * It exists because `app_users.worker_id` is a **soft** reference — no foreign
 * key crosses the schema boundary, so nothing in the database nulls it. The
 * comment in `schema.prisma` says the application does; this event is that
 * promise being kept.
 */
export class WorkerDeletedEvent {
  constructor(
    public readonly workerId: string,
    public readonly organizationId: string,
  ) {}
}
