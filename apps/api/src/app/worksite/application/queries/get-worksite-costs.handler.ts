import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { calculateActualCost, IWorksiteCosts } from '@chantia/shared';
import { ResourceNotFoundException } from '@shared/infrastructure/exceptions/not-found.exception';
import {
  WORKSITE_REPOSITORY_PORT,
  WorksiteRepositoryPort,
} from '../../domain/ports/worksite-repository.port';
import { GetWorksiteCostsQuery } from './get-worksite-costs.query';

@QueryHandler(GetWorksiteCostsQuery)
export class GetWorksiteCostsHandler implements IQueryHandler<GetWorksiteCostsQuery> {
  constructor(
    @Inject(WORKSITE_REPOSITORY_PORT)
    private readonly repository: WorksiteRepositoryPort,
  ) {}

  async execute(query: GetWorksiteCostsQuery): Promise<IWorksiteCosts> {
    const worksite = await this.repository.findById(query.worksiteId);
    if (!worksite) {
      throw new ResourceNotFoundException('Worksite', query.worksiteId);
    }

    const { timesheets, expenses } = await this.repository.findCostInputs(query.worksiteId);

    // Shared pure computation — same function the mobile app runs offline.
    return calculateActualCost({
      worksiteId: worksite.id,
      timesheets,
      expenses,
      totalBudget: worksite.totalBudget,
    });
  }
}
