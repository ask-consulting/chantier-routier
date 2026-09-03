import { DomainErrorKind, DomainException } from '@shared/domain/domain.exception';

/**
 * Refuses to delete somebody whose hours have already been counted.
 *
 * `timesheets.worker_id` cascades (see `schema.prisma`), so the deletion would
 * take the timesheets with it — and with them the labour cost of every worksite
 * this person ever worked on. A closed month would quietly change value, and
 * nothing would say why.
 *
 * `conflict`, not `forbidden`: the admin is allowed to do this, the *state* of
 * the row is what refuses. The message says how to get what they actually want.
 */
export class WorkerHasHistoryException extends DomainException {
  readonly kind: DomainErrorKind = 'conflict';

  constructor(timesheets: number) {
    super(
      `This worker has ${timesheets} timesheet${timesheets > 1 ? 's' : ''} and cannot be deleted — ` +
        'deleting would rewrite the cost of past worksites. Deactivate them instead.',
    );
  }
}
