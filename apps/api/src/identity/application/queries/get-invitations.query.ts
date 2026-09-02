import { InvitationSearchParams } from '../../domain/ports/invitation-repository.port';

/**
 * The invitations screen's list.
 *
 * `organizationId` is part of the params rather than implied, and the controller
 * fills it from the caller's token — the request has no say in it.
 */
export class GetInvitationsQuery {
  constructor(public readonly params: InvitationSearchParams) {}
}
