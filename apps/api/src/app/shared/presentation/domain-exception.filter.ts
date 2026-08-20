import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { DomainErrorKind, DomainException } from '../domain/domain.exception';

/**
 * The one place where a business error becomes an HTTP response.
 *
 * Registered globally in `main.ts`. It catches `DomainException` and nothing
 * else, so every `HttpException` raised by Nest itself — the `ValidationPipe`,
 * the auth guards, the throttler — still goes through the framework's default
 * handling, untouched.
 *
 * The body is byte-for-byte what these errors produced when they extended
 * `HttpException`: the web front reads `errors[].code` to translate password
 * rules, and `statusCode` to branch. Moving the errors out of HTTP was meant to
 * change where the decision lives, not what the caller receives.
 */
const RESPONSE: Record<DomainErrorKind, { status: number; error: string }> = {
  'not-found': { status: 404, error: 'Not Found' },
  unauthenticated: { status: 401, error: 'Unauthorized' },
  forbidden: { status: 403, error: 'Forbidden' },
  conflict: { status: 409, error: 'Conflict' },
  'invalid-input': { status: 400, error: 'Bad Request' },
};

@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter<DomainException> {
  catch(exception: DomainException, host: ArgumentsHost): void {
    const { status, error } = RESPONSE[exception.kind];

    void host
      .switchToHttp()
      .getResponse<FastifyReply>()
      .status(status)
      .send({
        message: exception.message,
        ...(exception.fieldErrors ? { errors: exception.fieldErrors } : {}),
        error,
        statusCode: status,
      });
  }
}
