import { DomainErrorKind, DomainException, FieldError } from '@shared/domain/domain.exception';

/**
 * A machine whose fields do not hold together — an unknown type, a purchase
 * without a price, a lease without an end, a retirement without a date.
 * Every broken rule at once, each pinned to its field, so a form can mark
 * them all in one round trip.
 */
export class InvalidEquipmentException extends DomainException {
  readonly kind: DomainErrorKind = 'invalid-input';

  constructor(errors: readonly FieldError[]) {
    super(errors.map((error) => error.message).join('; '), errors);
  }
}

/** Another current machine of the organization already carries the number. */
export class FleetNumberTakenException extends DomainException {
  readonly kind: DomainErrorKind = 'conflict';

  constructor(fleetNumber: string) {
    const message = `Fleet number ${fleetNumber} is already used`;
    super(message, [{ field: 'fleetNumber', code: 'form.errors.fleetNumberTaken', message }]);
  }
}
