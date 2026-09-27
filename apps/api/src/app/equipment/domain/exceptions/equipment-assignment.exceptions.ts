import { DomainErrorKind, DomainException } from '@shared/domain/domain.exception';

/** An assignment that cannot be — a period backwards, a machine or worksite that is not there. */
export class InvalidAssignmentException extends DomainException {
  readonly kind: DomainErrorKind = 'invalid-input';

  constructor(field: string, code: string, message: string) {
    super(message, [{ field, code: `form.errors.${code}`, message }]);
  }
}

/**
 * The machine is already on another worksite for part of the period — a
 * machine is never in two places on the same day.
 */
export class EquipmentAlreadyAssignedException extends DomainException {
  readonly kind: DomainErrorKind = 'conflict';

  constructor(conflict: { worksite: string; startDate: string; endDate: string }) {
    const message =
      `The machine is already assigned to ${conflict.worksite} ` +
      `from ${conflict.startDate} to ${conflict.endDate}`;
    super(message, [{ field: 'startDate', code: 'form.errors.equipmentAlreadyAssigned', message }]);
  }
}

/**
 * A change to a machine — a disposal date, an earlier contract end, a later
 * acquisition — that would leave some of its assignments on days it is not
 * there any more. The assignments are moved first.
 */
export class EquipmentAssignedOutsideException extends DomainException {
  readonly kind: DomainErrorKind = 'conflict';

  constructor(count: number) {
    super(
      `${count} assignment(s) of this machine fall outside the days it is available; ` +
        'move or remove them first',
    );
  }
}

/** A machine still booked from today on cannot be deleted. */
export class EquipmentStillAssignedException extends DomainException {
  readonly kind: DomainErrorKind = 'conflict';

  constructor(count: number) {
    super(`This machine still has ${count} current or future assignment(s)`);
  }
}

/**
 * A change that would rewrite days that already happened — they are in a
 * worksite's cost. Only `equipment:correct-history` may; everyone else ends
 * an assignment in progress rather than deleting it.
 */
export class AssignmentHistoryLockedException extends DomainException {
  readonly kind: DomainErrorKind = 'conflict';

  constructor(field: 'worksiteId' | 'startDate' | 'endDate' | 'id') {
    const message =
      field === 'id'
        ? 'This assignment has started: its past days are in the worksite’s cost. End it instead.'
        : `Changing ${field} would rewrite days that already happened`;
    super(message, [{ field, code: 'form.errors.assignmentHistoryLocked', message }]);
  }
}
