import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { SearchResult } from '@shared/domain/search.types';
import { Worksite } from '../../domain/entities/worksite.entity';
import {
  WORKSITE_REPOSITORY_PORT,
  WorksiteRepositoryPort,
} from '../../domain/ports/worksite-repository.port';
import { GetWorksitesQuery } from './get-worksites.query';

@QueryHandler(GetWorksitesQuery)
export class GetWorksitesHandler implements IQueryHandler<GetWorksitesQuery> {
  constructor(
    @Inject(WORKSITE_REPOSITORY_PORT)
    private readonly repository: WorksiteRepositoryPort,
  ) {}

  async execute(query: GetWorksitesQuery): Promise<SearchResult<Worksite>> {
    return this.repository.search(query.params);
  }
}
