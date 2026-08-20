import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ResourceNotFoundException } from '@shared/domain/exceptions/not-found.exception';
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
    // Tenant scoping happens in the Prisma layer: a worksite belonging to
    // another organization simply is not found. Reporting it as missing rather
    // than forbidden is also the right answer — a 403 would confirm the id
    // exists, and leak that a competitor is a customer.
    const worksite = await this.repository.findById(query.id);
    if (!worksite) {
      throw new ResourceNotFoundException('Worksite', query.id);
    }
    return worksite;
  }
}
