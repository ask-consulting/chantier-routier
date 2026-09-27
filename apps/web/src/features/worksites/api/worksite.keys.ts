import type { WorksiteListParams } from './worksite.api';

/**
 * Every cache key this feature uses, and nowhere else.
 *
 * The reason for a factory rather than literals scattered across hooks: an
 * invalidation has to *match*. Write `['worksites']` in one file and
 * `['worksite']` in another and nothing throws — the list simply stops
 * refreshing after a create, and you find out in production.
 *
 * The nesting is what makes `worksiteKeys.all` invalidate lists and details at
 * once: React Query matches keys by prefix.
 */
export const worksiteKeys = {
  all: ['worksites'] as const,
  lists: () => [...worksiteKeys.all, 'list'] as const,
  list: (params?: WorksiteListParams) => [...worksiteKeys.lists(), params ?? {}] as const,
  details: () => [...worksiteKeys.all, 'detail'] as const,
  detail: (id: string) => [...worksiteKeys.details(), id] as const,
  /**
   * Under the detail, so `worksiteKeys.all` reaches it too — which is what
   * lets a machine's assignment, written by another feature that only knows
   * `['worksites']`, refresh the cost shown here.
   */
  costs: (id: string) => [...worksiteKeys.detail(id), 'costs'] as const,
};
