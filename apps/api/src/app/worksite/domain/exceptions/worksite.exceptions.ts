import { DomainErrorKind, DomainException } from '@shared/domain/domain.exception';

/**
 * Another current worksite of this organization already carries the code.
 *
 * Raised from the unique index, not from a `SELECT` beforehand — two concurrent
 * creations would both see the code free. A soft-deleted worksite does not hold
 * its code: the index only covers rows where `deleted_at is null`.
 */
export class WorksiteCodeTakenException extends DomainException {
  readonly kind: DomainErrorKind = 'conflict';

  constructor(code: string) {
    super(`A worksite with code ${code} already exists`, [
      {
        field: 'code',
        code: 'form.errors.worksiteCodeTaken',
        message: `A worksite with code ${code} already exists`,
      },
    ]);
  }
}

/** The planned end falls before the planned start. */
export class InvalidWorksiteScheduleException extends DomainException {
  readonly kind: DomainErrorKind = 'invalid-input';

  constructor() {
    super('The planned end date cannot precede the planned start date', [
      {
        field: 'plannedEndDate',
        code: 'form.errors.endBeforeStart',
        message: 'The planned end date cannot precede the planned start date',
      },
    ]);
  }
}
