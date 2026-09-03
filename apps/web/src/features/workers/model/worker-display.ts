import type { Tone } from '@/shared/ui';

/**
 * How a worker's payroll state reads on screen.
 *
 * A boolean rather than an enum — `active` is the whole state — so this is a
 * function, not a lookup table keyed by string.
 */
export function workerStatusTone(active: boolean): Tone {
  return active ? 'success' : 'neutral';
}
