import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'auth:isPublic';

/**
 * Opts a route out of authentication. Authentication is on by default (the guard
 * is registered globally), so forgetting a decorator locks a route down rather
 * than exposing it.
 */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);
