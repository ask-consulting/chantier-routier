import type { WorkerListParams } from './worker.api';

/**
 * Every cache key this feature uses.
 *
 * A factory rather than literals, for the reason `invitation.keys.ts` gives: an
 * invalidation has to *match*, and a mismatched string fails silently — the
 * list simply stops refreshing after an edit, and you find out in production.
 */
export const workerKeys = {
  all: ['workers'] as const,
  lists: () => [...workerKeys.all, 'list'] as const,
  list: (params?: WorkerListParams) => [...workerKeys.lists(), params ?? {}] as const,
};
