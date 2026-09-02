/**
 * The invitations feature's public surface.
 *
 * Everything else is private, and ESLint says so: `@/features/invitations/*` is
 * a forbidden import path. Only what appears below can be reached from a route.
 */

export { InvitationListPage } from './ui/invitation-list-page';

// Exposed for a future dashboard tile ("3 invitations en attente") that will
// want the same colours without redeclaring them.
export { INVITATION_STATUS_TONE, INVITATION_STATUS_ORDER } from './model/invitation-display';

export { useInvitations } from './api/invitation.queries';
export type { InvitationListParams } from './api/invitation.api';
