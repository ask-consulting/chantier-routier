/**
 * The base every business error extends, and the reason it exists.
 *
 * These errors used to extend `HttpException` and carry their own status code.
 * That made them HTTP responses, not domain errors — and it showed: they lived
 * under `infrastructure/exceptions/`, were thrown from `application/`, and no
 * layer of `06-api-conventions-ddd-cqrs.md` could legally hold them. A rule that
 * has to make an exception for a whole folder is a rule with a hole in it.
 *
 * So a domain error now says *what went wrong*, never *what to answer*. The
 * translation happens once, in `DomainExceptionFilter`, which is presentation —
 * where HTTP belongs. Two things follow:
 *
 *   - A handler can be unit-tested without a framework: these are plain `Error`s.
 *   - The day a second transport appears (a queue consumer, a gRPC service), the
 *     status codes do not travel with the domain.
 *
 * `kind` is deliberately semantic rather than numeric. `RegistrationClosedException`
 * answers 404 while meaning "forbidden", and that is a presentation decision — it
 * belongs in the mapping table, not in the class that raises it.
 */
export type DomainErrorKind =
  | 'not-found'
  | 'unauthenticated'
  | 'forbidden'
  | 'conflict'
  | 'invalid-input';

/**
 * A per-field failure, in the shape the global `ValidationPipe` already produces.
 * `code` is an i18n key the client translates itself — the web front reads it to
 * mark every unmet password rule at once.
 */
export interface FieldError {
  field: string;
  code: string;
  message: string;
}

export abstract class DomainException extends Error {
  abstract readonly kind: DomainErrorKind;

  constructor(
    message: string,
    readonly fieldErrors?: readonly FieldError[],
  ) {
    super(message);
    // Without this, every subclass reports `Error` in a log or a stack trace.
    this.name = new.target.name;
  }
}
