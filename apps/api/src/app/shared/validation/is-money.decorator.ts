import { applyDecorators } from '@nestjs/common';
import { IsInt, Max } from 'class-validator';

/**
 * An amount: a whole number of the currency's smallest unit (see `money.ts` in
 * `@chantia/shared`). Bounded where a JavaScript number stops being exact.
 */
export function IsMoney(): PropertyDecorator {
  return applyDecorators(IsInt(), Max(Number.MAX_SAFE_INTEGER));
}
