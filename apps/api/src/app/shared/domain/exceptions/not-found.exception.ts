import { DomainException, DomainErrorKind } from '../domain.exception';

/** Thrown when an aggregate cannot be found. Answered as HTTP 404. */
export class ResourceNotFoundException extends DomainException {
  readonly kind: DomainErrorKind = 'not-found';

  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`);
  }
}
