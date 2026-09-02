import type { InvitationListParams } from './invitation.api';

/**
 * Every cache key this feature uses.
 *
 * A factory rather than literals, for the reason `worksite.keys.ts` gives: an
 * invalidation has to *match*, and a mismatched string fails silently — the list
 * simply stops refreshing after a resend, and you find out in production.
 *
 * The params are part of the key, so each filter combination caches separately
 * and going back to a previous filter is instant.
 */
export const invitationKeys = {
  all: ['invitations'] as const,
  lists: () => [...invitationKeys.all, 'list'] as const,
  list: (params?: InvitationListParams) => [...invitationKeys.lists(), params ?? {}] as const,
};
