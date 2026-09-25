import { ClientType } from '@chantia/shared';
import { DomainErrorKind, DomainException } from '@shared/domain/domain.exception';

/** The names sent do not fit the client's type. */
export class InvalidClientNameException extends DomainException {
  readonly kind: DomainErrorKind = 'invalid-input';

  constructor(type: ClientType) {
    const field = type === ClientType.LEGAL_ENTITY ? 'legalName' : 'lastName';
    const message =
      type === ClientType.LEGAL_ENTITY
        ? 'A legal entity needs a legal name'
        : 'An individual needs a first and a last name';
    super(message, [{ field, code: 'form.errors.required', message }]);
  }
}

/**
 * A contact id that does not belong to this client.
 *
 * Contacts carry no tenant of their own, so an id is only trusted when it is
 * already one of *this* client's contacts — otherwise a caller could name
 * another client's contact, possibly another organization's, and rewrite it.
 */
export class UnknownClientContactException extends DomainException {
  readonly kind: DomainErrorKind = 'invalid-input';

  constructor(contactId: string) {
    super(`Contact ${contactId} does not belong to this client`);
  }
}

/** A client that current worksites still point to cannot be deleted. */
export class ClientInUseException extends DomainException {
  readonly kind: DomainErrorKind = 'conflict';

  constructor(worksiteCount: number) {
    super(
      `This client still has ${worksiteCount} worksite(s); reassign or delete them first`,
    );
  }
}
