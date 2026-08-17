import { createHash } from 'node:crypto';
import { ExecutionContext, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerModule, seconds } from '@nestjs/throttler';
import { ThrottlingConfig } from '@config/throttling.config';
import {
  ThrottledRequest,
  asThrottledRequest,
  resolveClientIp,
  resolveCredentialSubject,
} from './trackers';

/** Limiter names. Exported so `@SkipRateLimit()` can name both of them. */
export const IP_THROTTLER = 'ip';
export const IDENTITY_THROTTLER = 'identity';

/**
 * One bucket per limiter and subject — *not* per route.
 *
 * The library's default key includes the handler name, which would hand out a
 * fresh budget on every endpoint: burn the allowance on `/auth/login`, carry on
 * against `/auth/accept-invitation`. Hashed because these keys hold email
 * addresses and live in a long-lived map.
 */
function bucketKey(_context: ExecutionContext, tracker: string, throttlerName: string): string {
  return createHash('sha256').update(`auth:${throttlerName}:${tracker}`).digest('hex');
}

function requestOf(context: ExecutionContext): ThrottledRequest {
  return context.switchToHttp().getRequest<ThrottledRequest>();
}

/**
 * Rate limiting for the authentication routes.
 *
 * `ThrottlerModule` registers itself globally, so importing this once in
 * `AppModule` is enough for `AuthController` to reach `ThrottlerGuard`. The
 * guard is deliberately *not* an `APP_GUARD`: it applies where credentials are
 * checked and nowhere else, so no business call is refused by a limit written
 * with password guessing in mind.
 *
 * Storage is in-memory, which is correct for one instance and only one: a second
 * replica would double every allowance.
 */
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const config = configService.getOrThrow<ThrottlingConfig>('throttling');
        return {
          // Names neither the limit that was hit nor whether the account exists:
          // a 429 that answers differently per email is an enumeration oracle.
          errorMessage: 'Too many attempts. Please try again later.',
          throttlers: [
            {
              name: IP_THROTTLER,
              limit: config.ipLimit,
              ttl: seconds(config.ipTtl),
              blockDuration: seconds(config.blockDuration),
              getTracker: (req: Record<string, unknown>): string =>
                resolveClientIp(asThrottledRequest(req), config.trustedProxyHops),
              generateKey: bucketKey,
            },
            {
              name: IDENTITY_THROTTLER,
              limit: config.identityLimit,
              ttl: seconds(config.identityTtl),
              blockDuration: seconds(config.blockDuration),
              // Routes that name nobody — token rotation, invitation preview —
              // opt out rather than pile into a shared bucket.
              skipIf: (context: ExecutionContext): boolean =>
                resolveCredentialSubject(requestOf(context)) === null,
              getTracker: (req: Record<string, unknown>): string =>
                resolveCredentialSubject(asThrottledRequest(req)) ?? '',
              generateKey: bucketKey,
            },
          ],
        };
      },
    }),
  ],
})
export class ThrottlingModule {}
