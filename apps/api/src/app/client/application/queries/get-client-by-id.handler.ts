import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ResourceNotFoundException } from '@shared/domain/exceptions/not-found.exception';
import { Client } from '../../domain/entities/client.entity';
import {
  CLIENT_REPOSITORY_PORT,
  ClientRepositoryPort,
} from '../../domain/ports/client-repository.port';
import { GetClientByIdQuery } from './get-client-by-id.query';

@QueryHandler(GetClientByIdQuery)
export class GetClientByIdHandler implements IQueryHandler<GetClientByIdQuery> {
  constructor(
    @Inject(CLIENT_REPOSITORY_PORT)
    private readonly repository: ClientRepositoryPort,
  ) {}

  async execute(query: GetClientByIdQuery): Promise<Client> {
    // Not found rather than forbidden for another tenant's id: a 403 would
    // confirm the id exists.
    const client = await this.repository.findById(query.id);
    if (!client) {
      throw new ResourceNotFoundException('Client', query.id);
    }
    return client;
  }
}
