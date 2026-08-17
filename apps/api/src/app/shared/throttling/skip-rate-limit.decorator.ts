import { SkipThrottle } from '@nestjs/throttler';
import { IDENTITY_THROTTLER, IP_THROTTLER } from './throttling.module';

/**
 * Exempt a route from both limiters.
 *
 * The library's `@SkipThrottle()` skips a limiter called `default`, which we do
 * not have — used bare here it silently does nothing. This names both, so an
 * exempted route really is exempt.
 *
 * For routes on a throttled controller that test no credential: reading your own
 * profile, signing out, changing your language.
 */
export const SkipRateLimit = (): MethodDecorator & ClassDecorator =>
  SkipThrottle({ [IP_THROTTLER]: true, [IDENTITY_THROTTLER]: true });
