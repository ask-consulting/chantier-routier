import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ResourceNotFoundException } from '@shared/infrastructure/exceptions/not-found.exception';
import { Worksite } from '../../domain/entities/worksite.entity';
import {
  WORKSITE_REPOSITORY_PORT,
  WorksiteRepositoryPort,
} from '../../domain/ports/worksite-repository.port';
import { GetWorksiteByIdQuery } from './get-worksite-by-id.query';

@QueryHandler(GetWorksiteByIdQuery)
export class GetWorksiteByIdHandler implements IQueryHandler<GetWorksiteByIdQuery> {
  constructor(
    @Inject(WORKSITE_REPOSITORY_PORT)
    private readonly repository: WorksiteRepositoryPort,
  ) {}

  async execute(query: GetWorksiteByIdQuery): Promise<Worksite> {
    const worksite = await this.repository.findById(query.id);
    if (!worksite) {
      throw new ResourceNotFoundException('Worksite', query.id);
    }
    return worksite;
  }
}
