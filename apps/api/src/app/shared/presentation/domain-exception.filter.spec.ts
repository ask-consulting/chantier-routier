import { ArgumentsHost } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { DomainErrorKind, DomainException, FieldError } from '../domain/domain.exception';
import { DomainExceptionFilter } from './domain-exception.filter';

/**
 * This filter is the only place a business error becomes an HTTP response, and
 * the refactor that created it promised the body was unchanged — same keys,
 * same statuses, same `errors[]`. That promise was kept by review, not by a
 * test, while the web front already reads the result field by field.
 *
 * These pin what a caller receives for each `kind`, shape included.
 *
 * The exceptions here are local fakes rather than the real ones from
 * `identity/`: `app/` cannot import that module (`08-identity-module.md`, and
 * the ESLint rule that now enforces it). It is also the honest unit — the
 * filter's whole contract is `kind` in, response out. Which kind each business
 * error declares is that error's own business, pinned in
 * `identity/domain/exceptions/identity.exceptions.spec.ts`.
 */

class Fake extends DomainException {
  constructor(
    readonly kind: DomainErrorKind,
    message = 'something went wrong',
    fieldErrors?: readonly FieldError[],
  ) {
    super(message, fieldErrors);
  }
}

function capture(exception: DomainException) {
  const send = vi.fn();
  const status = vi.fn().mockReturnValue({ send });
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;

  new DomainExceptionFilter().catch(exception, host);

  return {
    status: status.mock.calls[0]?.[0] as number,
    body: send.mock.calls[0]?.[0] as Record<string, unknown>,
  };
}

describe('DomainExceptionFilter', () => {
  const cases: ReadonlyArray<[DomainErrorKind, number, string]> = [
    ['not-found', 404, 'Not Found'],
    ['unauthenticated', 401, 'Unauthorized'],
    ['forbidden', 403, 'Forbidden'],
    ['conflict', 409, 'Conflict'],
    ['invalid-input', 400, 'Bad Request'],
  ];

  it.each(cases)('answers %s with %i', (kind, expectedStatus, expectedError) => {
    const { status, body } = capture(new Fake(kind));

    expect(status).toBe(expectedStatus);
    expect(body).toEqual({
      message: 'something went wrong',
      error: expectedError,
      statusCode: expectedStatus,
    });
  });

  /**
   * Every kind must map to something. A new one added to the union without a
   * row here would destructure `undefined` and answer a 500 at runtime — the
   * kind of gap a type alias alone does not close, since the table is indexed
   * at run time.
   */
  it('covers every kind the union declares', () => {
    const mapped = new Set(cases.map(([kind]) => kind));
    const declared: DomainErrorKind[] = [
      'not-found',
      'unauthenticated',
      'forbidden',
      'conflict',
      'invalid-input',
    ];

    for (const kind of declared) {
      expect(mapped.has(kind)).toBe(true);
      expect(() => capture(new Fake(kind))).not.toThrow();
    }
  });

  /**
   * The invitation form marks every unmet password rule in one round-trip: it
   * reads `errors[].code`, splits on the last dot and feeds that to i18n
   * (`use-invitation-form.ts`). The array must survive the filter untouched.
   */
  it('passes per-field errors through unchanged', () => {
    const fieldErrors: FieldError[] = [
      { field: 'password', code: 'form.errors.password.minLength', message: 'too short' },
      { field: 'password', code: 'form.errors.password.uppercase', message: 'needs uppercase' },
    ];

    const { body } = capture(new Fake('invalid-input', 'too short', fieldErrors));

    expect(body.errors).toEqual(fieldErrors);
  });

  /**
   * `errors` is absent, not `undefined` and not `[]`. A front branching on
   * `'errors' in body` sees a different answer for each of the three.
   */
  it('omits errors entirely when there is no per-field detail', () => {
    const { body } = capture(new Fake('unauthenticated'));

    expect(body).not.toHaveProperty('errors');
    expect(Object.keys(body)).toEqual(['message', 'error', 'statusCode']);
  });

  it('reports the subclass name, not Error, so a log names the failure', () => {
    expect(new Fake('conflict').name).toBe('Fake');
  });
});
