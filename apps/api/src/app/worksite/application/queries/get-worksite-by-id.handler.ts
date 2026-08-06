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
    // Another tenant's worksite is reported as missing, not forbidden: a 403
    // would confirm the id exists and leak that a competitor is a customer.
    if (!worksite || worksite.organizationId !== query.organizationId) {
      throw new ResourceNotFoundException('Worksite', query.id);
    }
    return worksite;
  }
}
