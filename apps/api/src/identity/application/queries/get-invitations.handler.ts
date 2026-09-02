import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { SearchResult } from '@shared/domain/search.types';
import {
  INVITATION_REPOSITORY_PORT,
  InvitationRepositoryPort,
} from '../../domain/ports/invitation-repository.port';
import { Invitation } from '../../domain/entities/invitation.entity';
import { GetInvitationsQuery } from './get-invitations.query';

@QueryHandler(GetInvitationsQuery)
export class GetInvitationsHandler implements IQueryHandler<GetInvitationsQuery> {
  constructor(
    @Inject(INVITATION_REPOSITORY_PORT)
    private readonly invitations: InvitationRepositoryPort,
  ) {}

  execute(query: GetInvitationsQuery): Promise<SearchResult<Invitation>> {
    return this.invitations.search(query.params);
  }
}
