import type { ClientListParams } from './client.api';

/**
 * Every cache key this feature uses — a factory, for the reason
 * `worksite.keys.ts` gives: an invalidation has to match, and a mismatched
 * literal fails silently.
 */
export const clientKeys = {
  all: ['clients'] as const,
  lists: () => [...clientKeys.all, 'list'] as const,
  list: (params?: ClientListParams) => [...clientKeys.lists(), params ?? {}] as const,
};
