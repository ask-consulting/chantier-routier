import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { SearchResult } from '@shared/domain/search.types';
import { Client } from '../../domain/entities/client.entity';
import {
  CLIENT_REPOSITORY_PORT,
  ClientRepositoryPort,
} from '../../domain/ports/client-repository.port';
import { GetClientsQuery } from './get-clients.query';

@QueryHandler(GetClientsQuery)
export class GetClientsHandler implements IQueryHandler<GetClientsQuery> {
  constructor(
    @Inject(CLIENT_REPOSITORY_PORT)
    private readonly repository: ClientRepositoryPort,
  ) {}

  async execute(query: GetClientsQuery): Promise<SearchResult<Client>> {
    return this.repository.search(query.params);
  }
}
